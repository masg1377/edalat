import { IsString, Length, Matches, MinLength } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^[\d۰-۹+\s-]{10,15}$/, { message: 'شماره موبایل معتبر نیست.' })
  phone!: string;
}

export class VerifyOtpDto {
  @IsString()
  phone!: string;

  @IsString()
  @Length(5, 5, { message: 'کد تأیید ۵ رقمی است.' })
  code!: string;
}

export class PasswordLoginDto {
  @IsString()
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
