import { HttpErrorResponse } from '@angular/common/http';
import { I18nService } from '../i18n/i18n.service';

export function httpErrorMessage(error: HttpErrorResponse): string {
  return I18nService.instance?.httpError(error) ?? I18nService.instance?.t('errors.generic') ?? 'Something went wrong. Please try again.';
}
