import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';

/**
 * Opens the Android date or time dialog (O-058) and reports the chosen value; dismissing the
 * dialog reports nothing.
 */
export function pickDateTime(
  mode: 'date' | 'time',
  initial: Date,
  onPicked: (value: Date) => void,
) {
  DateTimePickerAndroid.open({
    value: initial,
    mode,
    onChange: (event, value) => {
      if (event.type === 'set' && value) onPicked(value);
    },
  });
}
