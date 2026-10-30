import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DASHBOARD_LOW_STOCK_QUERY_KEY,
  DASHBOARD_TOP_PRODUCTS_QUERY_KEY,
} from '../../dashboard/hooks/useDashboardProducts'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useCategories } from '../../category/hooks/useCategories'
import { useBarcodeScanner } from '../../scanner/useBarcodeScanner'
import { Button } from '../../shared/components/Button/Button'
import { Card } from '../../shared/components/Card/Card'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog/ConfirmDialog'
import { Input } from '../../shared/components/Input/Input'
import { toast } from '../../shared/components/Toast/toast-store'
import { getInventoryErrorMessage } from '../../inventory/services/inventoryErrorMessage'
import { getProductUpdateErrorMessage } from '../services/productUpdateErrorMessage'
import {
  deactivateProduct,
  reactivateProduct,
  updateProduct,
  type ProductRecord,
  type UpdateProductRequest,
} from '../services/productApi'
import {
  INACTIVE_PRODUCTS_QUERY_KEY,
  PRODUCT_CATALOG_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
  useProductCatalog,
} from '../hooks/useProducts'
import type { ProductCatalogParams } from '../services/productApi'
import { ProductEditForm } from './ProductEditForm'
import styles from './ProductList.module.css'

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const PRODUCT_PAGE_SIZE = 20

type ProductListProps = {
  onScannerRead?: (barcode: string) => void
  scannerEnabled?: boolean
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tagName = target.tagName

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable
}

export function ProductList({ onScannerRead, scannerEnabled = true }: ProductListProps) {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(0)
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null)
  const [deactivatingProduct, setDeactivatingProduct] = useState<ProductRecord | null>(null)
  const [reactivatingProduct, setReactivatingProduct] = useState<ProductRecord | null>(null)
  const deactivationLock = useRef(false)
  const reactivationLock = useRef(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const { onScan } = useBarcodeScanner()
  const queryClient = useQueryClient()
  const categoriesQuery = useCategories(true)
  const searchIsReady = search.trim().length > 0 && search === debouncedSearch
  const catalogParams: ProductCatalogParams = {
    search: debouncedSearch,
    active: !showInactive,
    ...(categoryId ? { categoryId: Number(categoryId) } : {}),
    page,
    size: PRODUCT_PAGE_SIZE,
  }
  const catalogQuery = useProductCatalog(catalogParams, searchIsReady)
  const products = catalogQuery.data?.content ?? []
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: UpdateProductRequest
      lowStockDisplayChanged: boolean
    }) => updateProduct(id, payload),
    onSuccess: (updatedProduct, { lowStockDisplayChanged }) => {
      queryClient.setQueryData<ProductRecord[]>(PRODUCTS_QUERY_KEY, (currentProducts) =>
        currentProducts?.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)),
      )
      void queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: DASHBOARD_TOP_PRODUCTS_QUERY_KEY })
      if (lowStockDisplayChanged) {
        void queryClient.invalidateQueries({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY })
      }
      setEditingProduct(null)
      toast.success('Produto atualizado com sucesso.')
    },
    onError: (error) => {
      toast.error(getProductUpdateErrorMessage(error))
    },
  })
  const deactivateMutation = useMutation({
    mutationFn: (productId: number) => deactivateProduct(productId),
    onSuccess: async (_response, productId) => {
      queryClient.setQueryData<ProductRecord[]>(PRODUCTS_QUERY_KEY, (currentProducts) =>
        currentProducts?.filter((product) => product.id !== productId),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: INACTIVE_PRODUCTS_QUERY_KEY, exact: true }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY }),
      ])
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
  const reactivateMutation = useMutation({
    mutationFn: (productId: number) => reactivateProduct(productId),
    onSuccess: async (reactivatedProduct) => {
      queryClient.setQueryData<ProductRecord[]>(PRODUCTS_QUERY_KEY, (currentProducts) =>
        currentProducts
          ? currentProducts.some((product) => product.id === reactivatedProduct.id)
            ? currentProducts.map((product) =>
                product.id === reactivatedProduct.id ? reactivatedProduct : product,
              )
            : [...currentProducts, reactivatedProduct]
          : currentProducts,
      )
      queryClient.setQueryData<ProductRecord[]>(INACTIVE_PRODUCTS_QUERY_KEY, (currentProducts) =>
        currentProducts?.filter((product) => product.id !== reactivatedProduct.id),
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PRODUCT_CATALOG_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY, exact: true }),
        queryClient.invalidateQueries({ queryKey: INACTIVE_PRODUCTS_QUERY_KEY, exact: true }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_LOW_STOCK_QUERY_KEY }),
      ])
      setReactivatingProduct(null)
      toast.success('Produto reativado com sucesso e incluído na lista de ativos.')
    },
    onError: (error) => {
      toast.error(getInventoryErrorMessage(error, 'reactivation'))
    },
    onSettled: () => {
      reactivationLock.current = false
    },
  })
  const categoriesAvailable = Boolean(categoriesQuery.data?.length)
  const filtersApplied = Boolean(search.trim() || categoryId)

  const handleScannerRead = useEffectEvent((barcode: string) => {
    setSearch(barcode)
    setPage(0)
    onScannerRead?.(barcode)
  })

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearch(search), 300)
    return () => window.clearTimeout(timeoutId)
  }, [search])

  useEffect(() => {
    if (!scannerEnabled) {
      return
    }

    return onScan((barcode) => {
      handleScannerRead(barcode)
    })
  }, [onScan, scannerEnabled])

  useEffect(() => {
    if (!scannerEnabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'F2' ||
        isTypingTarget(event.target) ||
        document.querySelector('[role="dialog"]') !== null
      ) {
        return
      }

      event.preventDefault()
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [scannerEnabled])

  useEffect(() => {
    const totalPages = catalogQuery.data?.totalPages
    if (catalogQuery.isSuccess && totalPages !== undefined && page >= totalPages) {
      const timeoutId = window.setTimeout(() => setPage(Math.max(totalPages - 1, 0)), 0)
      return () => window.clearTimeout(timeoutId)
    }
    return undefined
  }, [catalogQuery.data?.totalPages, catalogQuery.isSuccess, page])

  const clearFilters = () => {
    setSearch('')
    setCategoryId('')
    setPage(0)
  }

  const changeSearch = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const changeCategory = (value: string) => {
    setCategoryId(value)
    setPage(0)
  }

  const changeStatus = (inactive: boolean) => {
    setShowInactive(inactive)
    setPage(0)
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

  const confirmReactivation = () => {
    if (!reactivatingProduct || reactivationLock.current) {
      return
    }

    reactivationLock.current = true
    reactivateMutation.mutate(reactivatingProduct.id)
  }

  const cancelReactivation = () => {
    if (!reactivationLock.current) {
      setReactivatingProduct(null)
    }
  }

  return (
    <Card title="Produtos" className={styles.card}>
      <div className={styles.tabs} role="group" aria-label="Status dos produtos">
        <Button
          type="button"
          variant={showInactive ? 'secondary' : 'primary'}
          aria-pressed={!showInactive}
          onClick={() => changeStatus(false)}
        >
          Produtos ativos
        </Button>
        <Button
          type="button"
          variant={showInactive ? 'primary' : 'secondary'}
          aria-pressed={showInactive}
          onClick={() => changeStatus(true)}
        >
          Produtos inativos
        </Button>
      </div>
      <div className={styles.filters} role="search" aria-label="Filtros de produtos">
        <Input
          ref={searchInputRef}
          label="Buscar produto"
          type="search"
          value={search}
          onChange={(event) => changeSearch(event.target.value)}
          placeholder="Digite o nome ou leia o código de barras..."
          className={styles.searchInput}
        />

        <div className={styles.categoryField}>
          <label className={styles.label} htmlFor="product-category-filter">
            Categoria
          </label>
          <select
            id="product-category-filter"
            className={styles.select}
            value={categoryId}
            onChange={(event) => changeCategory(event.target.value)}
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
      {!search.trim() ? (
        <p className={styles.status} role="status">
          Digite o nome ou código de barras para buscar produtos.
        </p>
      ) : !searchIsReady ? (
        <p className={styles.status} role="status" aria-busy="true">
          Atualizando busca...
        </p>
      ) : catalogQuery.isPending ? (
        <p className={styles.status} role="status" aria-busy="true">
          Buscando produtos...
        </p>
      ) : catalogQuery.isError ? (
        <div className={styles.message} role="alert">
          <span>Não foi possível carregar os produtos.</span>
          <Button type="button" variant="secondary" onClick={() => void catalogQuery.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : catalogQuery.data.totalElements === 0 ? (
        <p className={styles.status} role="status">
          Nenhum produto encontrado. Ajuste os filtros ou tente outra busca.
        </p>
      ) : (
        <>
          <p className={styles.resultCount} role="status">
            {catalogQuery.data.totalElements}{' '}
            {catalogQuery.data.totalElements === 1 ? 'produto encontrado' : 'produtos encontrados'}
          </p>
          <div className={styles.tableWrapper} aria-busy={catalogQuery.isFetching}>
            <table className={styles.table}>
              <caption className={styles.caption}>
                {catalogQuery.data.totalElements}{' '}
                {catalogQuery.data.totalElements === 1 ? 'produto encontrado' : 'produtos encontrados'}
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
                {products.map((product) => (
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
                        ) : (
                          <Button
                            type="button"
                            variant="success"
                            aria-label={`Reativar ${product.name}`}
                            disabled={reactivateMutation.isPending}
                            onClick={() => {
                              reactivateMutation.reset()
                              setReactivatingProduct(product)
                            }}
                          >
                            Reativar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className={styles.pagination} aria-label="Paginação de produtos">
            <Button
              type="button"
              variant="secondary"
              disabled={page === 0 || catalogQuery.isFetching}
              onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 0))}
            >
              Anterior
            </Button>
            <span>
              Página {catalogQuery.data.page + 1} de {catalogQuery.data.totalPages}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={page + 1 >= catalogQuery.data.totalPages || catalogQuery.isFetching}
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              Próxima
            </Button>
          </nav>
        </>
      )}

      {editingProduct ? (
        <ProductEditForm
          product={editingProduct}
          isSaving={updateMutation.isPending}
          errorMessage={updateMutation.isError ? getProductUpdateErrorMessage(updateMutation.error) : undefined}
          onSubmit={(payload) => updateMutation.mutate({
            id: editingProduct.id,
            payload,
            lowStockDisplayChanged:
              payload.name !== editingProduct.name || payload.barcode !== editingProduct.barcode,
          })}
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
      <ConfirmDialog
        open={Boolean(reactivatingProduct)}
        title="Reativar produto"
        description={
          reactivatingProduct
            ? `Deseja reativar "${reactivatingProduct.name}"? O produto voltará para a lista de ativos sem alteração no estoque ou no histórico.`
            : ''
        }
        confirmLabel="Reativar produto"
        confirmingLabel="Reativando..."
        confirmVariant="success"
        isConfirming={reactivateMutation.isPending}
        onConfirm={confirmReactivation}
        onCancel={cancelReactivation}
      />
    </Card>
  )
}
