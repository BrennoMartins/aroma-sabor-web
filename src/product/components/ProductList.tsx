import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { useCategories } from '../../category/hooks/useCategories'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog'
import { Input } from '../../shared/components/Input/Input'
import { toast } from '../../shared/components/Toast/toast-store'
import { getProductUpdateErrorMessage } from '../services/productUpdateErrorMessage'
import {
  deactivateProduct,
  updateProduct,
  type ProductRecord,
  type UpdateProductRequest,
} from '../services/productApi'
import { PRODUCTS_QUERY_KEY, useProducts } from '../hooks/useProducts'
import { ProductEditForm } from './ProductEditForm'
import styles from './ProductList.module.css'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

function matchesSearch(product: ProductRecord, normalizedSearch: string) {
  if (!normalizedSearch) {
    return true
  }

  return (
    product.name.toLocaleLowerCase('pt-BR').includes(normalizedSearch) ||
    product.barcode.toLocaleLowerCase('pt-BR').includes(normalizedSearch)
  )
}

export function ProductList() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [deactivatingProduct, setDeactivatingProduct] = useState<ProductRecord | null>(null)
  const deactivationLock = useRef(false)
  const queryClient = useQueryClient()
  const productsQuery = useProducts()
  const categoriesQuery = useCategories(true)
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateProductRequest }) => updateProduct(id, payload),
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData<ProductRecord[]>(PRODUCTS_QUERY_KEY, (currentProducts) =>
        currentProducts?.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)),
      )
      setEditingProduct(null)
      toast.success('Produto atualizado com sucesso.')
    },
    onError: (error) => {
      toast.error(getProductUpdateErrorMessage(error))
    },
  })
  const deactivateMutation = useMutation({
    mutationFn: (productId: number) => deactivateProduct(productId),
    onSuccess: (_response, productId) => {
      queryClient.setQueryData<ProductRecord[]>(PRODUCTS_QUERY_KEY, (currentProducts) =>
        currentProducts?.filter((product) => product.id !== productId),
      )
      setDeactivatingProduct(null)
      toast.success('Produto desativado com sucesso. Ele não aparecerá mais na lista de ativos.')
    },
    onError: () => {
      toast.error('Não foi possível desativar o produto. Nenhuma alteração foi confirmada.')
    },
    onSettled: () => {
      deactivationLock.current = false
    },
  })
  const normalizedSearch = search.trim().toLocaleLowerCase('pt-BR')
  const selectedCategoryId = categoryId ? Number(categoryId) : null
  const filteredProducts = useMemo(
    () =>
      (productsQuery.data ?? []).filter(
        (product) =>
          matchesSearch(product, normalizedSearch) &&
          (selectedCategoryId === null || product.categoryId === selectedCategoryId),
      ),
    [normalizedSearch, productsQuery.data, selectedCategoryId],
  )
  const filtersApplied = Boolean(normalizedSearch || categoryId)
  const categoriesAvailable = Boolean(categoriesQuery.data?.length)

  const clearFilters = () => {
    setSearch('')
    setCategoryId('')
  }

  const confirmDeactivation = () => {
    if (!deactivatingProduct || deactivationLock.current) {
      return
    }

    deactivationLock.current = true
    deactivateMutation.mutate(deactivatingProduct.id)
  }

  const cancelDeactivation = () => {
    if (!deactivationLock.current) {
      setDeactivatingProduct(null)
    }
  }

  return (
    <Card title="Produtos" className={styles.card}>
      <div className={styles.filters} role="search" aria-label="Filtros de produtos">
        <Input
          label="Buscar produto"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome ou código de barras"
        />

        <div className={styles.categoryField}>
          <label className={styles.label} htmlFor="product-category-filter">
            Categoria
          </label>
          <select
            id="product-category-filter"
            className={styles.select}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={categoriesQuery.isPending || categoriesQuery.isError || !categoriesAvailable}
          >
            <option value="">
              {categoriesQuery.isPending
                ? 'Carregando categorias...'
                : categoriesQuery.isError
                  ? 'Categorias indisponíveis'
                  : categoriesAvailable
                    ? 'Todas as categorias'
                    : 'Nenhuma categoria cadastrada'}
            </option>
            {categoriesQuery.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {categoriesQuery.isError ? (
            <div className={styles.message} role="alert">
              <span>Não foi possível carregar as categorias.</span>
              <Button type="button" variant="secondary" onClick={() => void categoriesQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={!filtersApplied}
          onClick={clearFilters}
        >
          Limpar filtros
        </Button>
      </div>
      <p className={styles.statusNotice}>
        A API lista somente produtos ativos. Produtos desativados não podem ser consultados ou reativados por esta
        interface.
      </p>

      {productsQuery.isPending ? (
        <p className={styles.status} role="status" aria-busy="true">
          Carregando produtos...
        </p>
      ) : productsQuery.isError ? (
        <div className={styles.message} role="alert">
          <span>Não foi possível carregar os produtos.</span>
          <Button type="button" variant="secondary" onClick={() => void productsQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <p className={styles.status} role="status">
          {filtersApplied
            ? 'Nenhum produto encontrado. Ajuste ou limpe os filtros.'
            : 'Nenhum produto cadastrado.'}
        </p>
      ) : (
        <div className={styles.tableWrapper} aria-busy={productsQuery.isFetching}>
          <table className={styles.table}>
            <caption className={styles.caption}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
            </caption>
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">Código de barras</th>
                <th scope="col">Categoria</th>
                <th scope="col">Preço</th>
                <th scope="col">Estoque</th>
                <th scope="col">Status</th>
                <th scope="col">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id}>
                  <th scope="row">{product.name}</th>
                  <td>{product.barcode}</td>
                  <td>{product.category ?? 'Não informada'}</td>
                  <td>{currencyFormatter.format(product.price)}</td>
                  <td>{product.stockQuantity}</td>
                  <td>
                    <span className={product.active ? styles.activeBadge : styles.inactiveBadge}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Button
                        type="button"
                        variant="secondary"
                        aria-label={`Editar ${product.name}`}
                        onClick={() => {
                          updateMutation.reset()
                          setEditingProduct(product)
                        }}
                      >
                        Editar
                      </Button>
                      {product.active ? (
                        <Button
                          type="button"
                          variant="danger"
                          aria-label={`Desativar ${product.name}`}
                          disabled={deactivateMutation.isPending}
                          onClick={() => {
                            deactivateMutation.reset()
                            setDeactivatingProduct(product)
                          }}
                        >
                          Desativar
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingProduct ? (
        <ProductEditForm
          product={editingProduct}
          isSaving={updateMutation.isPending}
          errorMessage={updateMutation.isError ? getProductUpdateErrorMessage(updateMutation.error) : undefined}
          onSubmit={(payload) => updateMutation.mutate({ id: editingProduct.id, payload })}
          onClose={() => setEditingProduct(null)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deactivatingProduct)}
        title="Desativar produto"
        description={
          deactivatingProduct
            ? `Deseja desativar "${deactivatingProduct.name}"? O produto sairá da lista de ativos e não poderá ser vendido. O histórico de vendas será preservado.`
            : ''
        }
        confirmLabel="Desativar produto"
        confirmingLabel="Desativando..."
        confirmVariant="danger"
        isConfirming={deactivateMutation.isPending}
        onConfirm={confirmDeactivation}
        onCancel={cancelDeactivation}
      />
    </Card>
  )
}
