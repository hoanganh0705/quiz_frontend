

import type { UpdateMeSettingsDtoPreferences } from './updateMeSettingsDtoPreferences';
import type { UpdateMeSettingsDtoPrivacy } from './updateMeSettingsDtoPrivacy';

export interface UpdateMeSettingsDto {

preferences?: UpdateMeSettingsDtoPreferences;

privacy?: UpdateMeSettingsDtoPrivacy;
}
