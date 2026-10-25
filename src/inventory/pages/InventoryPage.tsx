import { Card } from '../../shared/components/Card/Card'
import styles from './InventoryPage.module.css'

export function InventoryPage() {
  return (
    <section className={styles.page}>
      <Card title="Reposição de estoque" className={styles.card}>
        <p className={styles.status} role="status">
          Não é possível registrar entradas de estoque: o backend ainda não disponibiliza um endpoint de reposição.
          Nenhuma movimentação foi simulada ou gravada pelo frontend.
        </p>
        <h4 className={styles.heading}>Mudança necessária no backend</h4>
        <ul className={styles.list}>
          <li>
            Criar uma operação para registrar entrada com produto existente, quantidade positiva e motivo opcional.
          </li>
          <li>
            Atualizar o estoque e gravar uma movimentação do tipo <code>ENTRY</code> na mesma transação.
          </li>
          <li>Retornar os dados persistidos para que o frontend atualize os caches após a confirmação.</li>
        </ul>
      </Card>

      <Card title="Histórico de movimentações" className={styles.card}>
        <p className={styles.status} role="status">
          O backend ainda não disponibiliza um endpoint para consultar movimentações. Não há histórico para exibir
          nesta tela.
        </p>
        <h4 className={styles.heading}>Dados disponíveis no modelo do backend</h4>
        <ul className={styles.list}>
          <li>Produto relacionado, tipo, quantidade, motivo e data/hora.</li>
          <li>Referência à venda, quando a movimentação estiver associada a uma venda.</li>
          <li>
            Tipos definidos pelo banco: <code>SALE</code>, <code>ENTRY</code> e <code>ADJUSTMENT</code>.
          </li>
        </ul>
        <p className={styles.note}>
          O modelo não registra estoque anterior ou posterior. Também não há DTO, paginação ou filtros de consulta
          definidos para movimentações.
        </p>
      </Card>
    </section>
  )
}