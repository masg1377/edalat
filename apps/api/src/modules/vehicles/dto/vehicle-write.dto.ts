import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { FuelType, TransmissionType } from '@edalat/shared';

/** PRD §24 — the "Service Information" block, nested inside vehicle writes
 * rather than its own resource: `VehicleServiceInfo` only ever exists
 * attached to one vehicle (`@unique vehicleId`), so there is nothing to
 * address independently. */
export class VehicleServiceInfoDto {
  @IsOptional()
  @IsString()
  engineOilGrade?: string;

  @IsOptional()
  @IsNumber()
  engineOilCapacityLiters?: number;

  @IsOptional()
  @IsInt()
  oilChangeKm?: number;

  @IsOptional()
  @IsInt()
  oilFilterChangeKm?: number;

  @IsOptional()
  @IsInt()
  airFilterChangeKm?: number;

  @IsOptional()
  @IsInt()
  cabinFilterChangeKm?: number;

  @IsOptional()
  @IsInt()
  fuelFilterChangeKm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/** PRD §54 — admin create/update payload for `Vehicle` (+ VehicleServiceInfo). */
export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  brandId!: string;

  @IsString()
  @MinLength(1)
  model!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  generation?: string;

  @IsOptional()
  @IsInt()
  yearFrom?: number;

  @IsOptional()
  @IsInt()
  yearTo?: number;

  @IsOptional()
  @IsString()
  bodyType?: string;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @IsString()
  engineCode?: string;

  @IsOptional()
  @IsInt()
  displacement?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleServiceInfoDto)
  service?: VehicleServiceInfoDto;
}

// Deliberately not `PartialType(CreateVehicleDto)`: every field must stay
// individually optional on update, but `brandId`/`model` should still be
// validated as non-empty strings *if sent* — PartialType's generated class
// keeps the same validators, so this reads identically either way. Kept as
// its own class only so intent (create vs. patch) is explicit at call sites.
export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  generation?: string;

  @IsOptional()
  @IsInt()
  yearFrom?: number;

  @IsOptional()
  @IsInt()
  yearTo?: number;

  @IsOptional()
  @IsString()
  bodyType?: string;

  @IsOptional()
  @IsString()
  engine?: string;

  @IsOptional()
  @IsString()
  engineCode?: string;

  @IsOptional()
  @IsInt()
  displacement?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuelType?: FuelType;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  metaTitle?: string;

  @IsOptional()
  @IsString()
  metaDescription?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => VehicleServiceInfoDto)
  service?: VehicleServiceInfoDto;
}
