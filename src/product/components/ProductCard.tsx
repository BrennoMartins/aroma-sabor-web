import type { ProductRecord } from '../services/productApi'

type ProductCardProps = {
  product: ProductRecord
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card">
      <header className="product-card__header">
        <span className="product-card__label">Produto encontrado</span>
        <strong className="product-card__title">{product.name}</strong>
      </header>

      <dl className="product-card__grid">
        <div>
          <dt>Codigo</dt>
          <dd>{product.barcode}</dd>
        </div>
        <div>
          <dt>Categoria</dt>
          <dd>{product.category || 'Nao informada'}</dd>
        </div>
        <div>
          <dt>Preco</dt>
          <dd>{currencyFormatter.format(product.price)}</dd>
        </div>
        <div>
          <dt>Estoque atual</dt>
          <dd>{product.stockQuantity}</dd>
        </div>
      </dl>
    </article>
  )
}
