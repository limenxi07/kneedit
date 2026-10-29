type Props = {
  onCode: (code: string) => void;
  onClose: () => void;
};

/** The web has no scanner: the code is typed (physios add patients on a desktop). */
export function QrScanner(_props: Props) {
  return null;
}

/** Whether this platform can scan. */
export const CAN_SCAN = false;
