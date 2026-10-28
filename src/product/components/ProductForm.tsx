import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCategories } from '../../category/hooks/useCategories'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { Modal } from '../../shared/components/Modal/Modal'
import type { CreateProductRequest } from '../services/productApi'
import styles from './ProductForm.module.css'

type ProductFormProps = {
  open: boolean
  barcode: string | null
  isSaving: boolean
  onSubmit: (payload: CreateProductRequest) => void
  onClose: () => void
}

const productFormSchema = z.object({
  barcode: z.string().trim().min(3, 'Codigo invalido.'),
  name: z.string().trim().min(2, 'Informe o nome do produto.'),
  categoryId: z
    .string()
    .min(1, 'Selecione uma categoria.')
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, 'Selecione uma categoria valida.'),
  price: z
    .string()
    .trim()
    .min(1, 'Informe o preco.')
    .refine((value) => {
      const normalized = Number(value.replace(',', '.'))

      return Number.isFinite(normalized) && normalized > 0
    }, 'Informe um preco valido.'),
  costPrice: z
    .string()
    .trim()
    .refine((value) => {
      if (!value) {
        return true
      }

      const normalized = Number(value.replace(',', '.'))

      return /^\d{1,8}(?:[,.]\d{1,2})?$/.test(value) && Number.isFinite(normalized) && normalized <= 99999999.99
    }, 'Informe um preco de custo valido, com ate 2 casas decimais.'),
  initialStock: z
    .string()
    .trim()
    .min(1, 'Informe o estoque inicial.')
    .refine((value) => {
      const normalized = Number(value)

      return Number.isInteger(normalized) && normalized >= 0
    }, 'Informe um estoque inteiro maior ou igual a zero.'),
})

type ProductFormValues = z.infer<typeof productFormSchema>

export function ProductForm({ open, barcode, isSaving, onSubmit, onClose }: ProductFormProps) {
  const categoriesQuery = useCategories(open)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
    setError,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      barcode: '',
      name: '',
      categoryId: '',
      price: '',
      costPrice: '',
      initialStock: '',
    },
  })

  useEffect(() => {
    if (!open || !barcode) {
      return
    }

    reset({
      barcode,
      name: '',
      categoryId: '',
      price: '',
      costPrice: '',
      initialStock: '',
    })

    window.requestAnimationFrame(() => {
      setFocus('name')
    })
  }, [barcode, open, reset, setFocus])

  const submitForm = (values: ProductFormValues) => {
    const categoryId = Number(values.categoryId)
    const categoryIsAvailable = categoriesQuery.data?.some((category) => category.id === categoryId)

    if (!categoryIsAvailable) {
      setError('categoryId', { type: 'validate', message: 'Selecione uma categoria disponivel.' })
      return
    }

    const costPrice = values.costPrice.trim()

    onSubmit({
      barcode: values.barcode,
      name: values.name.trim(),
      categoryId,
      price: Number(values.price.replace(',', '.')),
      ...(costPrice ? { costPrice: Number(costPrice.replace(',', '.')) } : {}),
      stock: Number(values.initialStock),
    })
  }

  const categoriesAvailable = Boolean(categoriesQuery.data?.length)

  return (
    <Modal
      open={open}
      title="Cadastro inteligente de produto"
      onClose={isSaving ? () => undefined : onClose}
      actions={
        <>
          <Button variant="secondary" type="button" disabled={isSaving} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            type="submit"
            form="smart-product-form"
            loading={isSaving}
            disabled={categoriesQuery.isPending || categoriesQuery.isError || !categoriesAvailable}
          >
            Salvar
          </Button>
        </>
      }
    >
      <form id="smart-product-form" className="product-form" onSubmit={handleSubmit(submitForm)}>
        <Input label="Codigo" readOnly {...register('barcode')} error={errors.barcode?.message} />
        <Input label="Nome" autoFocus {...register('name')} error={errors.name?.message} />
        <div className={styles.field}>
          <label className={styles.label} htmlFor="categoryId">
            Categoria
          </label>
          <select
            id="categoryId"
            className={styles.select}
            disabled={categoriesQuery.isPending || categoriesQuery.isError || !categoriesAvailable}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={errors.categoryId ? 'categoryId-error' : undefined}
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
            <span id="categoryId-error" className={styles.error} role="alert">
              {errors.categoryId.message}
            </span>
          ) : null}
          {categoriesQuery.isError ? (
            <div className={styles.message} role="alert">
              <span>Nao foi possivel carregar as categorias. Tente novamente.</span>
              <Button type="button" variant="secondary" onClick={() => void categoriesQuery.refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : null}
          {categoriesQuery.isSuccess && !categoriesAvailable ? (
            <p className={styles.message} role="status">
              Nenhuma categoria cadastrada. O gerenciamento de categorias ainda nao esta disponivel.
            </p>
          ) : null}
          {categoriesQuery.isPending ? (
            <p className={styles.message} role="status">
              Carregando categorias...
            </p>
          ) : null}
        </div>
        <Input label="Preco" inputMode="decimal" placeholder="Ex.: 12,90" {...register('price')} error={errors.price?.message} />
        <Input
          label="Preço de custo"
          inputMode="decimal"
          placeholder="Ex.: 8,50 (opcional)"
          maxLength={11}
          {...register('costPrice')}
          error={errors.costPrice?.message}
        />
        <Input
          label="Estoque inicial"
          inputMode="numeric"
          placeholder="0"
          {...register('initialStock')}
          error={errors.initialStock?.message}
        />
      </form>
    </Modal>
  )
}
