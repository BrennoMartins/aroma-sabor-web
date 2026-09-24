export function EmptyState() {
  return (
    <section className="product-empty-state" aria-live="polite">
      <div className="product-empty-state__illustration" aria-hidden="true">
        <span className="product-empty-state__line product-empty-state__line--one" />
        <span className="product-empty-state__line product-empty-state__line--two" />
        <span className="product-empty-state__line product-empty-state__line--three" />
      </div>

      <strong className="product-empty-state__title">Aguardando leitura</strong>
      <p className="product-empty-state__copy">Passe um produto no scanner para comecar.</p>
    </section>
  )
}
