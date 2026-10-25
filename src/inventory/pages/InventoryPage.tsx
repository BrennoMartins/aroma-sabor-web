import { Card } from '../../shared/components/Card/Card'
import styles from './InventoryPage.module.css'

export function InventoryPage() {
  return (
    <section className={styles.page}>
      <Card title="Ajustes manuais de estoque" className={styles.card}>
        <p className={styles.status} role="status">
          Não é possível ajustar o estoque: o backend não oferece uma operação de ajuste que atualize o produto e
          registre a movimentação correspondente. Nenhuma alteração foi realizada.
        </p>
        <h4 className={styles.heading}>Contrato necessário no backend</h4>
        <ul className={styles.list}>
          <li>
            Disponibilizar <code>POST /api/products/{'{id}'}/stock-adjustments</code> com quantidade física encontrada,
            justificativa obrigatória e estoque esperado para detectar alterações concorrentes.
          </li>
          <li>
            Calcular a diferença usando o estoque lido no backend, atualizar o produto e gravar a movimentação
            <code> ADJUSTMENT</code> com diferença assinada e justificativa na mesma transação.
          </li>
          <li>
            Rejeitar estoque esperado desatualizado sem gravar alterações e retornar o produto persistido e a
            movimentação registrada.
          </li>
          <li>
            Definir como registrar ajustes sem diferença: a tabela atual rejeita movimentações com quantidade zero,
            portanto é necessário permitir e rastrear esse caso ou retornar explicitamente que nenhuma movimentação
            foi criada.
          </li>
        </ul>
      </Card>

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