import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CategoryPage } from '../../category/pages/CategoryPage'
import { ProductList } from '../components/ProductList'
import { ProductForm } from '../components/ProductForm'
import { StockRestockModal } from '../components/StockRestockModal'
import { useSmartProductRegistration } from '../hooks/useSmartProductRegistration'
import styles from './ProductPage.module.css'

export function ProductPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabValues = searchParams.getAll('tab')
  const activeTab = tabValues.length === 1 && tabValues[0] === 'categories' ? 'categories' : 'products'
  const hasInvalidTab = tabValues.length > 0 && activeTab !== 'categories'
  const {
    activeModal,
    registrationBarcode,
    selectedProduct,
    isSavingProduct,
    processScannedBarcode,
    submitNewProduct,
    closeAllModals,
  } = useSmartProductRegistration(activeTab === 'products')

  useEffect(() => {
    if (!hasInvalidTab) {
      return
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.delete('tab')
      return nextParams
    }, { replace: true })
  }, [hasInvalidTab, setSearchParams])

  useEffect(() => {
    if (activeTab === 'categories') {
      closeAllModals()
    }
  }, [activeTab, closeAllModals])

  const selectTab = (tab: 'products' | 'categories') => {
    if (tab === activeTab) {
      return
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)

      if (tab === 'categories') {
        nextParams.set('tab', 'categories')
      } else {
        nextParams.delete('tab')
      }

      return nextParams
    })
  }

  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return
    }

    event.preventDefault()
    const currentTab = event.currentTarget.id === 'products-tab' ? 'products' : 'categories'
    const nextTab = event.key === 'Home'
      ? 'products'
      : event.key === 'End'
        ? 'categories'
        : currentTab === 'products'
          ? 'categories'
          : 'products'
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    const nextTabIndex = nextTab === 'products' ? 0 : 1
    tabs?.[nextTabIndex]?.focus()
    selectTab(nextTab)
  }

  return (
    <div className={styles.page}>
      <div className={styles.tabs} role="tablist" aria-label="Gerenciamento de produtos">
        <button
          id="products-tab"
          className={styles.tab}
          type="button"
          role="tab"
          aria-selected={activeTab === 'products'}
          aria-controls="products-panel"
          tabIndex={activeTab === 'products' ? 0 : -1}
          onClick={() => selectTab('products')}
          onKeyDown={handleTabKeyDown}
        >
          Produtos
        </button>
        <button
          id="categories-tab"
          className={styles.tab}
          type="button"
          role="tab"
          aria-selected={activeTab === 'categories'}
          aria-controls="categories-panel"
          tabIndex={activeTab === 'categories' ? 0 : -1}
          onClick={() => selectTab('categories')}
          onKeyDown={handleTabKeyDown}
        >
          Categorias
        </button>
      </div>

      <section
        id="products-panel"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="products-tab"
        hidden={activeTab !== 'products'}
        tabIndex={0}
      >
        <ProductList
          onScannerRead={processScannedBarcode}
          scannerEnabled={activeTab === 'products'}
        />
        <ProductForm
          open={activeModal === 'register'}
          barcode={registrationBarcode}
          isSaving={isSavingProduct}
          onSubmit={submitNewProduct}
          onClose={closeAllModals}
        />

        <StockRestockModal
          key={`restock-${selectedProduct?.id ?? 'none'}-${activeModal}`}
          open={activeModal === 'restock'}
          product={selectedProduct}
          onClose={closeAllModals}
        />
      </section>

      <section
        id="categories-panel"
        className={styles.panel}
        role="tabpanel"
        aria-labelledby="categories-tab"
        hidden={activeTab !== 'categories'}
        tabIndex={0}
      >
        <CategoryPage />
      </section>
    </div>
  )
}