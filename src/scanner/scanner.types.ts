export type BarcodeScanListener = (barcode: string) => void

export type RegisterBarcodeScanListener = (
  listener: BarcodeScanListener,
) => () => void

export type BarcodeScannerContextValue = {
  onScan: RegisterBarcodeScanListener
}