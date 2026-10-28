import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useCategories } from '../../category/hooks/useCategories'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { Modal } from '../../shared/components/Modal/Modal'
import type { ProductRecord, UpdateProductRequest } from '../services/productApi'
import styles from './ProductForm.module.css'

type ProductEditFormProps = {
  product: ProductRecord
  isSaving: boolean
  errorMessage?: string
  onSubmit: (payload: UpdateProductRequest) => void
  onClose: () => void
}

const productEditSchema = z.object({
  barcode: z.string().trim().min(1, 'Informe o código de barras.'),
  name: z.string().trim().min(1, 'Informe o nome do produto.'),
  categoryId: z
    .string()
    .min(1, 'Selecione uma categoria.')
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, 'Selecione uma categoria válida.'),
  price: z
    .string()
    .trim()
    .min(1, 'Informe o preço.')
    .refine((value) => {
      const normalized = Number(value.replace(',', '.'))

      return Number.isFinite(normalized) && normalized >= 0
    }, 'Informe um preço válido maior ou igual a zero.'),
  costPrice: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) {
        return true
      }

      const normalized = Number(value.replace(',', '.'))

      return /^\d{1,8}(?:[,.]\d{1,2})?$/.test(value) && Number.isFinite(normalized) && normalized <= 99999999.99
    }, 'Informe um preço de custo válido, com até 2 casas decimais.'),
})

type ProductEditValues = z.infer<typeof productEditSchema>

function getProductEditValues(product: ProductRecord): ProductEditValues {
  return {
    barcode: product.barcode,
    name: product.name,
    categoryId: product.categoryId?.toString() ?? '',
    price: product.price.toFixed(2).replace('.', ','),
    costPrice: product.costPrice?.toFixed(2).replace('.', ',') ?? '',
  }
}

export function ProductEditForm({
  product,
  isSaving,
  errorMessage,
  onSubmit,
  onClose,
}: ProductEditFormProps) {
  const categoriesQuery = useCategories(true)
  const submitLock = useRef(false)
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setFocus,
    setError,
  } = useForm<ProductEditValues>({
    resolver: zodResolver(productEditSchema),
    defaultValues: getProductEditValues(product),
  })
  const categoryId = useWatch({ control, name: 'categoryId' })

  useEffect(() => {
    reset(getProductEditValues(product))
    window.requestAnimationFrame(() => setFocus('name'))
  }, [product, reset, setFocus])

  const categoriesAvailable = Boolean(categoriesQuery.data?.length)
  const fieldsDisabled =
    isSaving || categoriesQuery.isPending || categoriesQuery.isError || !categoriesAvailable

  useEffect(() => {
    if (!isSaving) {
      submitLock.current = false
    }
  }, [isSaving])

  const submitForm = (values: ProductEditValues) => {
    if (submitLock.current) {
      return
    }

    const categoryId = Number(values.categoryId)
    const categoryIsAvailable = categoriesQuery.data?.some((category) => category.id === categoryId)

    if (!categoryIsAvailable) {
      setError('categoryId', { type: 'validate', message: 'Selecione uma categoria disponível.' })
      return
    }
    submitLock.current = true
    onSubmit({
      barcode: values.barcode.trim(),
      name: values.name.trim(),
      categoryId,
      price: Number(values.price.replace(',', '.')),
      ...(values.costPrice.trim()
        ? { costPrice: Number(values.costPrice.replace(',', '.')) }
        : {}),
    })
  }

  const closeForm = () => {
    if (!isSaving && !submitLock.current) {
      onClose()
    }
  }

  return (
    <Modal
      open
      title="Editar produto"
      onClose={closeForm}
      actions={
        <>
          <Button variant="secondary" type="button" disabled={isSaving} onClick={closeForm}>
            Cancelar
          </Button>
          <Button
            variant="success"
            type="submit"
            form="product-edit-form"
            loading={isSaving}
            disabled={fieldsDisabled}
          >
            Salvar alterações
          </Button>
        </>
      }
    >
      <form
        id="product-edit-form"
        className="product-form"
        onSubmit={(event) => {
          void handleSubmit(submitForm)(event)
        }}
      >
        <Input
          label="Nome"
          autoFocus
          disabled={isSaving}
          {...register('name')}
          error={errors.name?.message}
        />
        <Input
          label="Código de barras"
          disabled={isSaving}
          {...register('barcode')}
          error={errors.barcode?.message}
        />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="product-edit-category">
            Categoria
          </label>
          <select
            id="product-edit-category"
            className={styles.select}
            disabled={fieldsDisabled}
            value={categoryId}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? 'product-edit-category-error' : undefined}
            {...register('categoryId')}
          >
            <option value="">
              {categoriesQuery.isPending
                ? 'Carregando categorias...'
                : categoriesAvailable
                  ? 'Selecione uma categoria'
                  : 'Nenhuma categoria disponível'}
            </option>
            {categoriesQuery.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId ? (
            <span id="product-edit-category-error" className={styles.error} role="alert">
              {errors.categoryId.message}
            </span>
          ) : null}
          {categoriesQuery.isError ? (
            <div className={styles.message} role="alert">
              <span>Não foi possível carregar as categorias.</span>
              <Button type="button" variant="secondary" onClick={() => void categoriesQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}
          {categoriesQuery.isPending ? (
            <p className={styles.message} role="status">
              Carregando categorias...
            </p>
          ) : null}
        </div>
        <Input
          label="Preço de venda"
          inputMode="decimal"
          placeholder="Ex.: 12,90"
          disabled={isSaving}
          {...register('price')}
          error={errors.price?.message}
        />
        <Input
          label="Preço de custo"
          inputMode="decimal"
          placeholder="Ex.: 8,50 (opcional)"
          maxLength={11}
          disabled={isSaving}
          {...register('costPrice')}
          error={errors.costPrice?.message}
        />
        <Input label="Estoque atual" value={product.stockQuantity} readOnly />
        {errorMessage ? (
          <p className={styles.message} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </form>
    </Modal>
  )
}
