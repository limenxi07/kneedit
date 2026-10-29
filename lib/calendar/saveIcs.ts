import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Hands an .ics file to the phone's share sheet, where the senior's family
 * can open it in their calendar. The web build downloads it instead (see
 * saveIcs.web.ts).
 */
export async function saveIcs(fileName: string, ics: string, dialogTitle: string): Promise<void> {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(ics);
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/calendar',
    UTI: 'com.apple.ical.ics',
    dialogTitle,
  });
}
