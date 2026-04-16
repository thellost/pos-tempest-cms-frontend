import { createFormHook } from '@tanstack/react-form'

import { CheckboxField } from '@/components/form-fields/checkbox-field'
import { ColorPickerField } from '@/components/form-fields/color-picker-field'
import { ComboboxField } from '@/components/form-fields/combobox-field'
import { DatePickerField } from '@/components/form-fields/date-picker-field'
import { DateRangePickerField } from '@/components/form-fields/date-range-picker-field'
import { ImageUploadField } from '@/components/form-fields/image-upload-field'
import { NumberField } from '@/components/form-fields/number-field'
import { PasswordField } from '@/components/form-fields/password-field'
import { PhoneField } from '@/components/form-fields/phone-field'
import { PinCodeField } from '@/components/form-fields/pin-code-field'
import { TimeField } from '@/components/form-fields/time-field'
import { RadioGroupField } from '@/components/form-fields/radio-group-field'
import { SelectField } from '@/components/form-fields/select-field'
import { SliderField } from '@/components/form-fields/slider-field'
import { SubscribeButton } from '@/components/form-fields/subscribe-button'
import { SwitchField } from '@/components/form-fields/switch-field'
import { TextareaField } from '@/components/form-fields/textarea-field'
import { TextField } from '@/components/form-fields/text-field'

import { fieldContext, formContext } from './form-context'

export const { useAppForm } = createFormHook({
  fieldComponents: {
    // Existing fields
    TextField,
    TextareaField,
    SelectField,
    SliderField,
    SwitchField,
    // New fields
    NumberField,
    ColorPickerField,
    DatePickerField,
    DateRangePickerField,
    ComboboxField,
    ImageUploadField,
    CheckboxField,
    RadioGroupField,
    PasswordField,
    PhoneField,
    PinCodeField,
    TimeField,
  },
  formComponents: {
    SubscribeButton,
  },
  fieldContext,
  formContext,
})
