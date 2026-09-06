import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JerseysService } from './jerseys.service';
import { R2Service } from '../r2/r2.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateJerseyDto } from './dto/createJersey.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ImageProcessingService } from '../image-processing/image-processing.service';
import { UpdateJerseyDto } from './dto/updateJersey.dto';

interface JwtRequest extends Request {
  user: {
    userId: string;
    email: string;
    username: string;
  };
}

@Controller('jerseys')
export class JerseysController {
  constructor(
    private readonly jerseysService: JerseysService,
    private readonly R2Service: R2Service,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'frontImage', maxCount: 1 },
      { name: 'backImage', maxCount: 1 },
    ]),
  )
  async createJersey(
    @Request() req,
    @Body() createJerseyDto: CreateJerseyDto,
    @UploadedFiles()
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
    },
  ) {
    if (!files.frontImage?.[0])
      throw new BadRequestException('Front image is required');

    const userId = req.user?.userId;

    if (!userId) {
      throw new BadRequestException('Authenticated user id is missing');
    }

    if (!createJerseyDto.sportId) {
      console.log('ATTENTION : sportId est vide dans le DTO');
    }

    const frontImageBuffer = files.frontImage[0].buffer;
    const processedFrontImage =
      await this.imageProcessingService.removeBackground(frontImageBuffer);

    try {
      // Upload
      const frontUrl = await this.R2Service.uploadFile({
        ...files.frontImage[0],
        buffer: processedFrontImage,
      });
      const backUrl = files.backImage
        ? await this.R2Service.uploadFile(files.backImage[0])
        : undefined;

      console.log('Front image uploaded to:', frontUrl);
      if (backUrl) {
        console.log('Back image uploaded to:', backUrl);
      }

      const sportId = req.body.sportId || createJerseyDto.sportId;
      const clubName = createJerseyDto.clubName;

      console.log('[JerseyController] resolved sportId:', sportId);
      console.log('[JerseyController] clubName:', clubName);
      console.log('[JerseyController] dto values:', {
        type: createJerseyDto.type,
        condition: createJerseyDto.condition,
        version: createJerseyDto.version,
        isOfficial: createJerseyDto.isOfficial,
        brand: createJerseyDto.brand,
      });

      if (!sportId) {
        throw new BadRequestException('sportId est manquant dans le FormData');
      }

      const clubData = { name: clubName, sportId: sportId };

      const jerseyDtoWithUrls = {
        ...createJerseyDto,
        sportId: sportId,
        frontImageUrl: frontUrl,
        backImageUrl: backUrl,
      };

      return this.jerseysService.createJersey(
        userId,
        jerseyDtoWithUrls,
        clubData,
      );
    } catch (error) {
      console.error('Error while creating jersey:', error);
      throw error;
    }
  }

  @Get('search-clubs')
  @UseGuards(JwtAuthGuard)
  async searchClubs(
    @Query('query') query: string,
    @Query('sportId') sportId: string,
  ) {
    console.log('DEBUG BACKEND - Query:', query);
    console.log('DEBUG BACKEND - SportId:', sportId);
    if (!query || !sportId) {
      throw new BadRequestException('Query and sportId are required');
    }
    return await this.jerseysService.searchClubs(query, sportId);
  }

  @Get('total')
  @UseGuards(JwtAuthGuard)
  async totalJerseys(@Request() req) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Authenticated user id is missing');
    }
    return await this.jerseysService.getTotalJerseysCount(userId);
  }

  @Get('MostRepresentedClub')
  @UseGuards(JwtAuthGuard)
  async mostRepresentedClub(@Request() req) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Authenticated user id is missing');
    }
    return await this.jerseysService.getMostReprentedClub(userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAllByUser(@Request() req) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Authenticated user id is missing');
    }
    return this.jerseysService.getJerseysByUser(userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteJersey(@Param('id') id: string) {
    return this.jerseysService.deleteJersey(id);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getCollectionAnalytics(@Request() req) {
    const userId = req.user?.userId;
    if (!userId) {
      throw new BadRequestException('Authenticated user id is missing');
    }

    return this.jerseysService.getCollectionAnalytics(userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'frontImage', maxCount: 1 },
      { name: 'backImage', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() updateJerseyDto: UpdateJerseyDto,
    @UploadedFiles()
    files: {
      frontImage?: Express.Multer.File[];
      backImage?: Express.Multer.File[];
    },
    @Req() req: JwtRequest,
  ) {
    const dtoWithUrls: any = { ...updateJerseyDto };

    if (files.frontImage?.[0]) {
      dtoWithUrls.frontImageUrl = await this.R2Service.uploadFile(
        files.frontImage[0],
      );
    }
    if (files.backImage?.[0]) {
      dtoWithUrls.backImageUrl = await this.R2Service.uploadFile(
        files.backImage[0],
      );
    }

    // if clubName is provided and clubId is not, create a new club or find existing one, then update the jersey's clubId
    const clubData =
      updateJerseyDto.clubName && !updateJerseyDto.clubId
        ? { name: updateJerseyDto.clubName, sportId: updateJerseyDto.sportId! }
        : undefined;

    return this.jerseysService.updateJersey(
      id,
      req.user.userId,
      dtoWithUrls,
      clubData,
    );
  }

  @Get(':id/likes')
  @UseGuards(JwtAuthGuard)
  async getJerseyLikes(@Param('id') jerseyId: string) {
    return this.jerseysService.getJerseyLikes(jerseyId);
  }
}
