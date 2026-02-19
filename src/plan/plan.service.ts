import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from '../database/database.service';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanFeatureDto } from '../dto/update-plan-features.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createPlan(dto: CreatePlanDto) {
    const { code, name, price, billingCycle, features, description } = dto;

    if (!features || features.length === 0) {
      throw new BadRequestException('A plan must have at least one feature.');
    }

    const unique = new Set(features.map((f) => f.feature));
    if (unique.size !== features.length) {
      throw new BadRequestException('Duplicate features are not allowed.');
    }

    const planExists = await this.databaseService.plan.findUnique({
      where: {
        code,
      },
    });

    if (planExists) {
      throw new BadRequestException('A plan with same code already exists.');
    }

    const createdPlan = await this.databaseService.$transaction(async (tx) => {
      const plan = await tx.plan.create({
        data: {
          code,
          name,
          price,
          billingCycle,
          description: description ?? null,
        },
      });

      await tx.planFeature.createMany({
        data: features.map((f) => ({
          planId: plan.id,
          feature: f.feature,
          limit: f.limit ?? null,
        })),
      });

      const planFeatures = await tx.planFeature.findMany({
        where: { planId: plan.id },
      });

      return { plan, planFeatures };
    });

    return {
      success: true,
      planDetails: createdPlan.plan,
      planFeatures: createdPlan.planFeatures,
    };
  }

  async getAllPlans() {
    const allPlans = await this.databaseService.plan.findMany({
      where: {
        isActive: true,
      },
      include: {
        features: true,
      },
    });

    return {
      success: true,
      allPlans,
    };
  }

  async getPlanDetails(planId: string) {
    const planExists = await this.databaseService.plan.findUnique({
      where: {
        id: planId,
      },
      include: {
        features: true,
      },
    });

    if (!planExists) {
      throw new NotFoundException("Plan doesn't exists.");
    }

    return {
      success: true,
      planDetails: planExists,
    };
  }

  async updatePlanFeatures(
    tx: Prisma.TransactionClient,
    planId: string,
    features: UpdatePlanFeatureDto[],
  ) {
    // fetch existing features for plan
    const existingFeatures = await tx.planFeature.findMany({
      where: {
        planId,
      },
    });

    // Build lookup maps
    const existingFeaturesMap = new Map(
      existingFeatures.map((f) => [f.feature, f]),
    );

    const incomingFeatureSet = new Set(features.map((f) => f.feature));

    // Update incoming features
    for (const f of features) {
      const exisiting = existingFeaturesMap.get(f.feature);
      if (exisiting) {
        await tx.planFeature.update({
          where: {
            planId_feature: {
              planId,
              feature: f.feature,
            },
          },
          data: {
            limit: f.limit ?? null,
          },
        });
      } else {
        await tx.planFeature.create({
          data: {
            planId,
            feature: f.feature,
            limit: f.limit ?? null,
          },
        });
      }
    }
    await tx.planFeature.deleteMany({
      where: {
        planId,
        feature: {
          notIn: [...incomingFeatureSet],
        },
      },
    });
  }

  async updatePlan(planId: string, dto: UpdatePlanDto) {
    const planExists = await this.databaseService.plan.findUnique({
      where: {
        id: planId,
      },
    });

    if (!planExists) {
      throw new NotFoundException("Plan doesn't exists.");
    }

    const { features, ...planData } = dto;

    await this.databaseService.$transaction(async (tx) => {
      await tx.plan.update({
        where: {
          id: planId,
        },
        data: planData,
      });

      // Feature logic
      if (features) {
        await this.updatePlanFeatures(tx, planId, features);
      }
    });

    return {
      success: true,
      message: 'Plan updated successfully.',
    };
  }

  async softDeletePlan(planId: string) {
    const plan = await this.databaseService.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException("Plan doesn't exist.");
    }

    if (!plan.isActive) {
      return {
        success: true,
        message: 'Plan is already disabled.',
      };
    }

    const activeSubscriptions = await this.databaseService.subscription.count({
      where: {
        planId,
        status: 'ACTIVE',
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        'Cannot disable a plan with active subscriptions.',
      );
    }

    await this.databaseService.plan.update({
      where: { id: planId },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'Plan disabled successfully.',
    };
  }
}
