# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

## Contratos financeiros consumidos

As regras financeiras pertencem ao backend (`mercadinho`); o frontend **não recalcula** lucro, rateio nem totais, apenas
valida e exibe o que a API retorna. A descrição completa (cálculo, rateio, exemplos e agregação) está no `README.md` do
backend. Esta seção resume como os contratos são tratados aqui.

### Significado dos campos

- `subtotal`, `discountAmount`, `total`: valores da venda; `total = subtotal − discountAmount`.
- `unitCostPrice` e `discountAllocatedAmount` (por item): valores históricos gravados na venda. `0` é um valor real;
  `null` significa não registrado (venda legada) e nunca deve ser exibido ou tratado como zero.
- `grossProfitKnownAmount`: `null` = lucro **indeterminado**; `0` = lucro conhecido igual a zero; valores negativos
  são válidos.
- `grossProfitComplete`: `true` apenas quando nenhum item está sem custo histórico. `grossProfitKnownAmount: null`
  sempre acompanha `grossProfitComplete: false`.
- `itemsWithoutHistoricalCost`: quantidade de itens sem custo histórico.
- Valor conhecido com `grossProfitComplete: false` é uma **contribuição conhecida** de parte dos itens, e não o lucro
  total; a interface o rotula como "Incompleto".

### Validação (Zod) e compatibilidade

| Contrato | Arquivo | Tolerância |
| --- | --- | --- |
| Venda (`GET /sales`, `GET /sales/{id}`) | `src/sales/services/salesApi.ts` | `subtotal` e `discountAmount` opcionais (respostas antigas; não são preenchidos). Campos históricos do item (`productName`, `categoryId`, `categoryName`, `unitCostPrice`, `discountAllocatedAmount`) assumem `null` se ausentes, sem inventar valores. `quantity`, `unitPrice` e `subtotal` do item, e os três campos de lucro da venda, são **obrigatórios** |
| Relatório (`GET /reports/sales`) | `src/sales/services/salesReportApi.ts` | Todos os campos obrigatórios; `grossProfitKnownAmount` aceita `null`; a série diária deve cobrir o período pedido |
| Dashboard (`GET /dashboard/summary`) | `src/dashboard/services/dashboardApi.ts` | Todos os campos obrigatórios; `grossProfitKnownAmount` aceita `null` |
| Criação de venda (`POST /sales`) | `src/caixa/services/saleApi.ts` | Resposta com campos financeiros opcionais; a requisição envia `items` (com `unitPrice`) e `discountAmount`, nunca custo |

A tolerância a campos ausentes é específica dos campos acima e não deve ser estendida às propriedades que o frontend
ainda exige. Respostas inválidas geram erros dedicados (`InvalidSaleResponseError`, `InvalidSalesReportResponseError`,
`InvalidDashboardSummaryError`) em vez de indicadores fictícios.

### Exibição

- Venda não concluída: lucro exibido como `—` (o backend envia `null`/`false`, significando "não aplicável").
- Venda concluída com `null`: "Lucro indeterminado"; com `grossProfitComplete: false`: "Incompleto (valor)" e a
  quantidade de itens sem custo; caso contrário, o valor.
- Relatório e dashboard seguem a mesma lógica sobre o agregado do backend, que é `null` se qualquer venda do período
  for indeterminada.
- A listagem de vendas soma localmente o lucro das vendas concluídas exibidas, em centavos, e mostra "indeterminado"
  quando alguma delas tem `grossProfitKnownAmount: null`.
- Resumo do dashboard e relatório vêm de um snapshot transacional único por requisição (`REPEATABLE_READ`); as demais
  requisições (vendas, produtos mais vendidos, estoque baixo) são independentes e podem refletir momentos distintos.
