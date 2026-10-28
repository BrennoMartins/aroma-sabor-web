import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { Card } from '../../shared/components/Card/Card'
import { Button } from '../../shared/components/Button/Button'
import { Input } from '../../shared/components/Input/Input'
import { CATEGORIES_QUERY_KEY, useCategories } from '../hooks/useCategories'
import { createCategory } from '../services/categoryApi'
import styles from './CategoryPage.module.css'

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome da categoria.').max(100, 'Use no máximo 100 caracteres.'),
})

type CategoryFormValues = z.infer<typeof categorySchema>

function getCreateErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 409) {
      return 'Já existe uma categoria com esse nome.'
    }

    if (error.response?.status === 400) {
      return 'O nome da categoria é inválido. Use até 100 caracteres.'
    }
  }

  return 'Não foi possível cadastrar a categoria. Verifique a conexão e tente novamente.'
}

export function CategoryPage() {
  const queryClient = useQueryClient()
  const categoriesQuery = useCategories(true)
  const submitLock = useRef(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '' },
  })
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async (category) => {
      await queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY, exact: true })
      reset()
      setErrorMessage('')
      setSuccessMessage(`Categoria "${category.name}" cadastrada com sucesso.`)
    },
    onError: (error) => {
      setSuccessMessage('')
      setErrorMessage(getCreateErrorMessage(error))
    },
    onSettled: () => {
      submitLock.current = false
    },
  })

  const submitCategory = (values: CategoryFormValues) => {
    if (submitLock.current) {
      return
    }

    submitLock.current = true
    setSuccessMessage('')
    setErrorMessage('')
    createMutation.mutate({ name: values.name })
  }

  return (
    <Card title="Categorias" className="page-section">
      <form
        className={styles.form}
        onSubmit={(event) => {
          void handleSubmit(submitCategory)(event)
        }}
        noValidate
      >
        <Input
          label="Nome da categoria"
          maxLength={100}
          autoComplete="off"
          disabled={createMutation.isPending}
          {...register('name')}
          error={errors.name?.message}
        />
        <Button type="submit" loading={createMutation.isPending} disabled={createMutation.isPending}>
          Cadastrar categoria
        </Button>
      </form>

      {errorMessage ? (
        <p className={styles.message} role="alert">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className={styles.message} role="status">
          {successMessage}
        </p>
      ) : null}

      <section className={styles.list} aria-labelledby="category-list-heading">
        <h2 id="category-list-heading" className={styles.heading}>
          Categorias cadastradas
        </h2>
        {categoriesQuery.isPending ? (
          <p className={styles.message} role="status" aria-busy="true">
            Carregando categorias...
          </p>
        ) : categoriesQuery.isError ? (
          <div className={styles.message} role="alert">
            <span>Não foi possível carregar as categorias.</span>
            <Button type="button" variant="secondary" onClick={() => void categoriesQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : categoriesQuery.data.length === 0 ? (
          <p className={styles.message} role="status">
            Nenhuma categoria cadastrada.
          </p>
        ) : (
          <ul className={styles.categories}>
            {categoriesQuery.data.map((category) => (
              <li key={category.id}>{category.name}</li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  )
}