const activeOperations = new Set<string>()

export function acquireStockOperationLock(key: string) {
  if (activeOperations.has(key)) {
    return false
  }
  activeOperations.add(key)
  return true
}

export function releaseStockOperationLock(key: string) {
  activeOperations.delete(key)
}
