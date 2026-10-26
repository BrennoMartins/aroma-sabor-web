import { AlertTriangle, Award, Package, RefreshCw } from 'lucide-react'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { useDashboardLowStockProducts, useDashboardTopProducts } from '../hooks/useDashboardProducts'
import styles from './DashboardPage.module.css'

function InsightLoading({ label }: { label: string }) {
  return (
    <p className={styles.insightState} role="status" aria-busy="true">
      <span className={styles.spinner} aria-hidden="true" />
      Carregando {label}...
    </p>
  )
}

function InsightError({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <div className={styles.insightError}>
      <p className={styles.insightState} role="alert">
        Não foi possível carregar {label}.
      </p>
      <Button type="button" variant="secondary" icon={<RefreshCw size={15} aria-hidden="true" />} onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

function TopProductsSection() {
  const query = useDashboardTopProducts()

  return (
    <Card title="Produtos mais vendidos" className={styles.panel}>
      <p className={styles.sectionDescription}>Unidades vendidas nos últimos sete dias</p>
      {query.isPending ? (
        <InsightLoading label="os produtos mais vendidos" />
      ) : query.isError || !query.data ? (
        <InsightError label="os produtos mais vendidos" onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <p className={styles.emptyState} role="status">
          Ainda não há vendas concluídas suficientes neste período.
        </p>
      ) : (
        <ol className={styles.insightList} aria-label="Ranking de produtos mais vendidos">
          {query.data.map((product, index) => (
            <li
              className={`${styles.insightItem} ${index === 0 ? styles.topProduct : ''}`}
              key={product.productId}
            >
              <span className={styles.insightLeading}>
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.productName}>{product.productName}</span>
              </span>
              <span className={styles.insightTrailing}>
                {index === 0 ? <Award className={styles.rankIcon} size={17} aria-label="Mais vendido" /> : null}
                <strong>{product.quantitySold}</strong>
                <span className={styles.unitLabel}>un.</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function LowStockSection() {
  const query = useDashboardLowStockProducts()

  return (
    <Card title="Estoque baixo" className={styles.panel}>
      <p className={styles.sectionDescription}>Produtos que precisam de reposição</p>
      {query.isPending ? (
        <InsightLoading label="os produtos com estoque baixo" />
      ) : query.isError || !query.data ? (
        <InsightError label="os produtos com estoque baixo" onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <p className={styles.positiveEmpty} role="status">
          <Package size={18} aria-hidden="true" />
          Nenhum produto com estoque baixo.
        </p>
      ) : (
        <ul className={styles.insightList} aria-label="Produtos com estoque baixo">
          {query.data.map((product) => (
            <li className={styles.insightItem} key={product.id}>
              <span className={styles.stockProduct}>
                <strong className={styles.productName}>{product.name}</strong>
                <span className={styles.barcode}>Código de barras: {product.barcode}</span>
              </span>
              <span className={`${styles.stockValue} ${product.stock === 0 ? styles.outOfStock : ''}`}>
                {product.stock === 0 ? <AlertTriangle size={16} aria-hidden="true" /> : null}
                <strong>{product.stock}</strong>
                <span className={styles.unitLabel}>un.</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function DashboardProductSections() {
  return (
    <section className={styles.content} aria-label="Indicadores de produtos">
      <TopProductsSection />
      <LowStockSection />
    </section>
  )
}
