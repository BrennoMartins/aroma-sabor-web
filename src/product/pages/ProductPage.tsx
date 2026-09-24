import type { FormEvent } from 'react'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { Input } from '../../shared/components/Input/Input'
import { EmptyState } from '../components/EmptyState'
import { ProductForm } from '../components/ProductForm'
import { StockRestockModal } from '../components/StockRestockModal'
import { useSmartProductRegistration } from '../hooks/useSmartProductRegistration'

export function ProductPage() {
  const {
    activeModal,
    registrationBarcode,
    selectedProduct,
    manualBarcode,
    setManualBarcode,
    runManualSearch,
    manualSearchInputRef,
    feedback,
    isCheckingProduct,
    isSavingProduct,
    submitNewProduct,
    submitRestock,
    closeAllModals,
  } = useSmartProductRegistration()

  const panelClassName =
    feedback === 'found'
      ? 'smart-product smart-product--found'
      : feedback === 'new'
        ? 'smart-product smart-product--new'
        : feedback === 'error'
          ? 'smart-product smart-product--error'
          : 'smart-product'

  const handleManualSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    runManualSearch()
  }

  return (
    <section className={panelClassName}>
      <div className="smart-product__header">
        <h2 className="page-card__title">Cadastro inteligente de produtos</h2>
        <p className="page-card__description">
          Escaneie um codigo de barras para abrir automaticamente reposicao ou cadastro de produto novo.
        </p>
      </div>

      <div className="smart-product__grid">
        <Card className="smart-product__manual" title="Busca manual">
          <form className="smart-product__manual-form" onSubmit={handleManualSubmit}>
            <Input
              ref={manualSearchInputRef}
              label="Codigo de barras (F2)"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              placeholder="Bipe ou digite o codigo"
            />

            <Button type="submit" loading={isCheckingProduct}>
              Buscar produto
            </Button>
          </form>

          <div className="shortcut-list smart-product__shortcuts">
            <div className="shortcut-list__item">
              <span>ESC</span>
              <strong>Fechar modal</strong>
            </div>
            <div className="shortcut-list__item">
              <span>Enter</span>
              <strong>Salvar formulario</strong>
            </div>
            <div className="shortcut-list__item">
              <span>F2</span>
              <strong>Focar busca manual</strong>
            </div>
          </div>
        </Card>

        <Card className="smart-product__state" title="Fluxo de leitura">
          {isCheckingProduct ? <p className="inline-status">Consultando produto por codigo...</p> : <EmptyState />}
        </Card>
      </div>

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
        onConfirm={submitRestock}
      />
    </section>
  )
}