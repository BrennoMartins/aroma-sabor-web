import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { Modal } from '../../shared/components/Modal/Modal'
import type { CreateProductRequest } from '../services/productApi'

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
  category: z.string().trim().min(2, 'Informe a categoria.'),
  price: z
    .string()
    .trim()
    .min(1, 'Informe o preco.')
    .refine((value) => {
      const normalized = Number(value.replace(',', '.'))

      return Number.isFinite(normalized) && normalized > 0
    }, 'Informe um preco valido.'),
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
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setFocus,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      barcode: '',
      name: '',
      category: '',
      price: '',
      initialStock: '0',
    },
  })

  useEffect(() => {
    if (!open || !barcode) {
      return
    }

    reset({
      barcode,
      name: '',
      category: '',
      price: '',
      initialStock: '0',
    })

    window.requestAnimationFrame(() => {
      setFocus('name')
    })
  }, [barcode, open, reset, setFocus])

  const submitForm = (values: ProductFormValues) => {
    onSubmit({
      barcode: values.barcode,
      name: values.name.trim(),
      category: values.category.trim(),
      price: Number(values.price.replace(',', '.')),
      stockQuantity: Number(values.initialStock),
    })
  }

  return (
    <Modal
      open={open}
      title="Cadastro inteligente de produto"
      onClose={onClose}
      actions={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="success" type="submit" form="smart-product-form" loading={isSaving}>
            Salvar
          </Button>
        </>
      }
    >
      <form id="smart-product-form" className="product-form" onSubmit={handleSubmit(submitForm)}>
        <Input label="Codigo" readOnly {...register('barcode')} error={errors.barcode?.message} />
        <Input label="Nome" autoFocus {...register('name')} error={errors.name?.message} />
        <Input label="Categoria" {...register('category')} error={errors.category?.message} />
        <Input label="Preco" inputMode="decimal" placeholder="Ex.: 12,90" {...register('price')} error={errors.price?.message} />
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
