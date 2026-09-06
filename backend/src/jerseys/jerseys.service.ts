import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJerseyDto } from './dto/createJersey.dto';
import { R2Service } from '../r2/r2.service';
import { FootballService } from '../search/football.service';

type CreateJerseyWithUrls = CreateJerseyDto & {
  frontImageUrl: string;
  backImageUrl?: string;
};

@Injectable()
export class JerseysService {
  constructor(
    private prisma: PrismaService,
    private readonly r2Service: R2Service,
    private readonly FootballService: FootballService,
  ) {}

  public async signJersey<
    T extends {
      frontImageUrl: string;
      backImageUrl: string | null;
      _count?: { likes?: number };
      likesCount?: number;
    },
  >(jersey: T) {
    const [frontImageUrl, backImageUrl] = await Promise.all([
      this.r2Service.getSignedUrl(jersey.frontImageUrl),
      this.r2Service.getSignedUrl(jersey.backImageUrl),
    ]);

    const likesCount = jersey._count?.likes ?? jersey.likesCount ?? 0;

    return {
      ...jersey,
      frontImageUrl: frontImageUrl ?? jersey.frontImageUrl,
      backImageUrl,
      likesCount,
    };
  }

  async createJersey(
    userId: string,
    dto: CreateJerseyWithUrls,
    clubData: { name: string; sportId: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    const isElite =
      (user?.subscription?.planType === 'ELITE_MONTHLY' ||
        user?.subscription?.planType === 'ELITE_YEARLY') &&
      user?.subscription?.status === 'active';

    if (!isElite) {
      const currentCount = await this.prisma.jersey.count({
        where: { userId },
      });

      const FREE_JERSEY_LIMIT = 15;

      if (currentCount >= FREE_JERSEY_LIMIT) {
        throw new ForbiddenException(
          `You have reached the limit of ${FREE_JERSEY_LIMIT} jerseys for free users. Please upgrade to an ELITE subscription to add more jerseys.`,
        );
      }
    }

    //search for the club in the database first
    let club = await this.prisma.club.findUnique({
      where: {
        sportId_name: {
          sportId: clubData.sportId,
          name: clubData.name,
        },
      },
    });

    // if the club doesn't exist, search for it using the FootballService and create it in the database
    if (!club) {
      const teams = await this.FootballService.searchTeams(clubData.name);

      // search for the team with the exact name (case-insensitive), if not found, take the first one
      const targetTeam = teams.find(
        (t) => t.name.toLowerCase() === clubData.name.toLowerCase(),
      );

      // If no exact match is found, refuse the creation instead of using the raw user input
      if (!targetTeam) {
        throw new BadRequestException(
          'No matching team found for the provided club name. Please provide a valid club name.',
        );
      }

      // if api doesnt find any team, create the club with the name provided by the user and no logo

      club = await this.prisma.club.create({
        data: {
          name: targetTeam.name,
          sportId: clubData.sportId,
          logoUrl: targetTeam?.logo || null,
        },
      });
    }
    // Update the club's logo if it's missing
    else if (!club.logoUrl) {
      const teams = await this.FootballService.searchTeams(clubData.name);
      const foundLogo = teams[0]?.logo;
      if (foundLogo) {
        club = await this.prisma.club.update({
          where: { id: club.id },
          data: { logoUrl: foundLogo },
        });
      }
    }

    // Prepare the jersey data for creation
    const jerseyData = {
      userId,
      sportId: clubData.sportId,
      clubId: club.id,
      frontImageUrl: dto.frontImageUrl,
      backImageUrl: dto.backImageUrl || null,
      playerName: dto.playerName || null,
      number: dto.number ? Number(dto.number) : null,
      season: dto.season,
      type: dto.type,
      size: dto.size,
      condition: dto.condition,
      version: dto.version,
      description: dto.description || null,
      isOfficial: dto.isOfficial,
      brand: dto.brand,
      purchasePrice: dto.purchasePrice ?? null,
    };

    const createdJersey = await this.prisma.jersey.create({
      data: jerseyData,
      include: { club: true, sport: true },
    });

    return this.signJersey(createdJersey);
  }

  async searchClubs(query: string, sportId: string) {
    // SÉCURITÉ BACKEND : Si le sportId est vide ou absent, on ne cherche rien
    if (!sportId || sportId.trim() === '') {
      return [];
    }

    // Search for clubs in the database first
    const dbClubs = await this.prisma.club.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive', // Case-insensitive search
        },
        sportId: sportId,
      },
      take: 5, // Limit the number of results
    });

    // If we found clubs in the database, return them
    if (dbClubs.length > 0) {
      return dbClubs;
    }

    // If no clubs were found in the database, search using the FootballService
    const apiClubs = await this.FootballService.searchTeams(query);

    return apiClubs;
  }

  async getJerseysByUser(userId: string) {
    const jerseys = await this.prisma.jersey.findMany({
      where: { userId },
      include: { club: true, sport: true, _count: { select: { likes: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(jerseys.map((jersey) => this.signJersey(jersey)));
  }

  async getJerseyById(id: string) {
    const jersey = await this.prisma.jersey.findUnique({
      where: { id },
      include: { club: true, _count: { select: { likes: true } } },
    });

    if (!jersey) {
      throw new NotFoundException(`Jersey with ID ${id} not found`);
    }

    return this.signJersey(jersey);
  }

  async deleteJersey(id: string) {
    const jersey = await this.prisma.jersey.findUnique({
      where: { id },
    });

    if (!jersey) {
      throw new NotFoundException(`Jersey with ID ${id} not found`);
    }

    // delete the images from R2
    await Promise.all([
      this.r2Service.deleteFile(jersey.frontImageUrl),
      jersey.backImageUrl
        ? this.r2Service.deleteFile(jersey.backImageUrl)
        : null,
    ]);

    // delete the jersey from the database
    await this.prisma.jersey.delete({
      where: { id },
    });

    return { message: 'Jersey deleted successfully' };
  }

  async getTotalJerseysCount(userId?: string): Promise<number> {
    const count = await this.prisma.jersey.count({
      where: {
        userId: userId,
      },
    });
    return count;
  }

  async getMostReprentedClub(userId: string) {
    // 1. On cherche d'abord les maillots de l'utilisateur pour grouper par club
    const result = await this.prisma.jersey.groupBy({
      by: ['clubId'],
      where: { userId: userId }, // On filtre bien par l'utilisateur ici
      _count: { clubId: true },
      orderBy: { _count: { clubId: 'desc' } },
      take: 1,
    });

    if (result.length === 0) return null;

    // 2. Maintenant on récupère le nom du club avec son ID
    const club = await this.prisma.club.findUnique({
      where: { id: result[0].clubId },
      select: { id: true, name: true, logoUrl: true },
    });

    return {
      id: club?.id,
      name: club?.name || 'Unknown Club',
      count: result[0]._count.clubId,
      logoUrl: club?.logoUrl || null,
    };
  }

  async getCollectionAnalytics(userId: string) {
    const jerseys = await this.prisma.jersey.findMany({
      where: { userId },
      include: { club: true },
    });

    if (jerseys.length === 0) {
      return {
        totalKits: 0,
        uniqueClubs: 0,
        erasCovered: 0,
        brandsCount: 0,
        totalInvested: 0,
        avgPrice: 0,
        pricedKitsCount: 0,
        topClubs: [],
        eras: [],
        brands: [],
        variants: [],
        versions: [],
        conditions: [],
        crownJewel: null,
        acquisitionsByYear: [],
        cumulativeSpend: [],
      };
    }

    const totalKits = jerseys.length;

    // Clubs uniques
    const uniqueClubsSet = new Set(jerseys.map((j) => j.clubId));
    const uniqueClubs = uniqueClubsSet.size;

    // Era coverage
    const erasSet = new Set(
      jerseys
        .map((j) => {
          if (!j.season) return null;
          const year = parseInt(j.season.substring(0, 4));
          if (isNaN(year)) return null;
          return `${Math.floor(year / 10) * 10}`;
        })
        .filter(Boolean),
    );
    const erasCovered = erasSet.size;

    // Uniques brands
    const brandsSet = new Set(jerseys.map((j) => j.brand).filter(Boolean));
    const brandsCount = brandsSet.size;

    // --- TOTAL INVESTED & AVG PRICE ---
    // Filter jerseys that have a purchasePrice defined and not null
    const jerseysWithPrice = jerseys.filter(
      (j) => j.purchasePrice !== null && j.purchasePrice !== undefined,
    );
    const totalInvested = jerseysWithPrice.reduce(
      (acc, j) => acc + Number(j.purchasePrice),
      0,
    );
    const avgPrice =
      jerseysWithPrice.length > 0
        ? Math.round(totalInvested / jerseysWithPrice.length)
        : 0;
    const pricedKitsCount = jerseysWithPrice.length;

    // --- CROWN JEWEL (most expensive jersey) ---
    const sortedByPrice = [...jerseysWithPrice].sort(
      (a, b) => Number(b.purchasePrice) - Number(a.purchasePrice),
    );
    const crownJewelJersey = sortedByPrice[0] || null;
    const crownJewel = crownJewelJersey
      ? {
          id: crownJewelJersey.id,
          clubName: crownJewelJersey.club?.name || 'Unknown',
          season: crownJewelJersey.season,
          type: crownJewelJersey.type,
          price: Number(crownJewelJersey.purchasePrice),
          frontImageUrl: crownJewelJersey.frontImageUrl,
        }
      : null;

    // --- TOP CLUBS (avec logo) ---
    const clubCounts: Record<
      string,
      { name: string; count: number; logo?: string | null }
    > = {};
    jerseys.forEach((j) => {
      const clubName = j.club?.name || 'Unknown';
      if (!clubCounts[j.clubId]) {
        clubCounts[j.clubId] = {
          name: clubName,
          count: 0,
          logo: j.club?.logoUrl ?? null,
        };
      }
      clubCounts[j.clubId].count += 1;
    });

    const sortedClubs = Object.values(clubCounts).sort(
      (a, b) => b.count - a.count,
    );
    const maxClubCount = sortedClubs[0]?.count || 1;
    const topClubs = sortedClubs.slice(0, 5).map((c) => ({
      name: c.name,
      count: c.count,
      maxCount: maxClubCount,
      logo: c.logo,
    }));

    // --- KITS BY ERA ---
    const eraCounts: Record<string, number> = {};
    jerseys.forEach((j) => {
      if (!j.season) return;
      const year = parseInt(j.season.substring(0, 4));
      const era = isNaN(year) ? 'Other' : `${Math.floor(year / 10) * 10}`;
      eraCounts[era] = (eraCounts[era] || 0) + 1;
    });

    const sortedEras = Object.entries(eraCounts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const maxEraCount = sortedEras[0]?.count || 1;
    const eras = sortedEras.map((e) => ({ ...e, maxCount: maxEraCount }));

    // --- BRAND MIX ---
    const brandCounts: Record<string, number> = {};
    jerseys.forEach((j) => {
      const brand = j.brand || 'Other';
      brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    });
    const brands = Object.entries(brandCounts).map(([name, count]) => ({
      name,
      count,
    }));

    // --- VARIANTS ---
    const variantCounts: Record<string, number> = {};
    jerseys.forEach((j) => {
      const variant = j.type || 'Standard';
      variantCounts[variant] = (variantCounts[variant] || 0) + 1;
    });
    const sortedVariants = Object.entries(variantCounts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const maxVariantCount = sortedVariants[0]?.count || 1;
    const variants = sortedVariants.map((v) => ({
      ...v,
      maxCount: maxVariantCount,
    }));

    // --- VERSION MIX ---
    const versionCounts: Record<string, number> = {};
    jerseys.forEach((j) => {
      const version = j.version || 'Unknown';
      versionCounts[version] = (versionCounts[version] || 0) + 1;
    });
    const sortedVersions = Object.entries(versionCounts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const maxVersionCount = sortedVersions[0]?.count || 1;
    const versions = sortedVersions.map((v) => ({
      ...v,
      maxCount: maxVersionCount,
    }));

    // --- CONDITION MIX ---
    const conditionCounts: Record<string, number> = {};
    jerseys.forEach((j) => {
      const condition = j.condition || 'Not specified';
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });
    const sortedConditions = Object.entries(conditionCounts)
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);
    const maxConditionCount = sortedConditions[0]?.count || 1;
    const conditions = sortedConditions.map((c) => ({
      ...c,
      maxCount: maxConditionCount,
    }));

    // --- ACQUISITIONS TIMELINE ---
    const acquisitionsByYearMap: Record<string, number> = {};
    jerseys.forEach((j) => {
      const year = j.createdAt.getFullYear().toString();
      acquisitionsByYearMap[year] = (acquisitionsByYearMap[year] || 0) + 1;
    });
    const acquisitionsByYear = Object.entries(acquisitionsByYearMap)
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // --- MONTHLY GROWTH DATA (kits count + cumulative spend, month by month) ---
    // --- MONTHLY GROWTH DATA (nouveau, kits + dépenses cumulés mois par mois) ---
    interface MonthlyData {
      kitsAdded: number;
      spendAdded: number;
    }

    const monthlyDataMap: Record<string, MonthlyData> = {};

    jerseys.forEach((j) => {
      const date = j.createdAt;
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyDataMap[monthKey]) {
        monthlyDataMap[monthKey] = { kitsAdded: 0, spendAdded: 0 };
      }
      monthlyDataMap[monthKey].kitsAdded += 1;
      if (j.purchasePrice) {
        monthlyDataMap[monthKey].spendAdded += Number(j.purchasePrice);
      }
    });

    const sortedMonths = Object.keys(monthlyDataMap).sort();

    let cumulativeKits = 0;
    let cumulativeSpend = 0;

    const collectionGrowth = sortedMonths.map((month) => {
      cumulativeKits += monthlyDataMap[month].kitsAdded;
      return { month, count: cumulativeKits };
    });

    const cumulativeSpendData = sortedMonths.map((month) => {
      cumulativeSpend += monthlyDataMap[month].spendAdded;
      return { month, amount: Math.round(cumulativeSpend * 100) / 100 };
    });

    return {
      totalKits,
      uniqueClubs,
      erasCovered,
      brandsCount,
      totalInvested,
      avgPrice,
      pricedKitsCount,
      topClubs,
      eras,
      brands,
      variants,
      conditions,
      versions,
      crownJewel,
      acquisitionsByYear,
      collectionGrowth,
      cumulativeSpend: cumulativeSpendData,
    };
  }

  async updateJersey(
    jerseyId: string,
    userId: string,
    dto: Partial<CreateJerseyWithUrls>,
    clubData?: { name: string; sportId: string },
  ) {
    const jersey = await this.prisma.jersey.findUnique({
      where: { id: jerseyId },
    });

    if (!jersey) {
      throw new NotFoundException(`Jersey with ID ${jerseyId} not found`);
    }

    if (jersey.userId !== userId) {
      throw new ForbiddenException(
        `User ${userId} is not authorized to update this jersey`,
      );
    }

    const updateData: Record<string, any> = {};

    const fields = [
      'clubId',
      'season',
      'type',
      'size',
      'condition',
      'version',
      'brand',
      'playerName',
      'number',
      'purchasePrice',
      'isOfficial',
      'description',
      'frontImageUrl',
      'backImageUrl',
    ] as const;

    for (const field of fields) {
      if (dto[field] !== undefined) {
        updateData[field] = dto[field];
      }
    }

    // if new name club is provided, search for it in the database or create it if it doesn't exist, then update the jersey's clubId
    if (clubData?.name) {
      let club = await this.prisma.club.findUnique({
        where: {
          sportId_name: {
            sportId: clubData.sportId,
            name: clubData.name,
          },
        },
      });

      if (!club) {
        const teams = await this.FootballService.searchTeams(clubData.name);
        const targetTeam =
          teams.find(
            (t) => t.name.toLowerCase() === clubData.name.toLowerCase(),
          ) || teams[0];

        club = await this.prisma.club.create({
          data: {
            name: targetTeam?.name || clubData.name,
            sportId: clubData.sportId,
            logoUrl: targetTeam?.logo || null,
          },
        });
      }

      updateData.clubId = club.id; // Update the jersey's clubId to the new club's ID
    }

    const updatedJersey = await this.prisma.jersey.update({
      where: { id: jerseyId },
      data: updateData,
      include: { club: true, sport: true, _count: { select: { likes: true } } },
    });

    return this.signJersey(updatedJersey);
  }

  async getJerseyLikes(jerseyId: string) {
    const likes = await this.prisma.jerseyLike.findMany({
      where: { jerseyId },
      include: {
        user: { select: { id: true, username: true } },
      },
    });

    return likes.map((like) => ({
      id: like.user.id,
      username: like.user.username,
    }));
  }
}
