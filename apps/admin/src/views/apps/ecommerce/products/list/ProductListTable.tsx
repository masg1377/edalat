'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import Avatar from '@mui/material/Avatar'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import type { TextFieldProps } from '@mui/material/TextField'

// Third-party Imports
import classnames from 'classnames'
import { toast } from 'react-toastify'
import { rankItem } from '@tanstack/match-sorter-utils'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel
} from '@tanstack/react-table'
import type { ColumnDef, FilterFn } from '@tanstack/react-table'
import type { RankingInfo } from '@tanstack/match-sorter-utils'

// Type Imports
import type { BrandSummary, CategorySummary, ProductSummary } from '@edalat/shared'
import { MAX_PAGE_SIZE } from '@edalat/shared'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

// Lib Imports
import { adminApi, ApiError } from '@/lib/api'

// Style Imports
import tableStyles from '@core/styles/table.module.css'

declare module '@tanstack/table-core' {
  interface FilterFns {
    fuzzy: FilterFn<unknown>
  }
  interface FilterMeta {
    itemRank: RankingInfo
  }
}

type ProductRow = ProductSummary & { actions?: string }

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })
  
return itemRank.passed
}

const DebouncedInput = ({
  value: initialValue,
  onChange,
  debounce = 400,
  ...props
}: { value: string; onChange: (value: string) => void; debounce?: number } & Omit<TextFieldProps, 'onChange'>) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => setValue(initialValue), [initialValue])
  useEffect(() => {
    const timeout = setTimeout(() => onChange(value), debounce)

    
return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <CustomTextField {...props} value={value} onChange={e => setValue(e.target.value)} />
}

const columnHelper = createColumnHelper<ProductRow>()

const money = (n: number) => `${n.toLocaleString('fa-IR')} تومان`

/**
 * PRD §15/§53 — product listing. Same table shell as `ProductCategoryTable.tsx`
 * (search box, page-size select, DataTable, TablePaginationComponent),
 * adapted from `full-version`'s `ProductListTable.tsx` with a real
 * `GET /products` (public catalog) fetch and brand/category filters instead
 * of the demo's in-memory rows.
 */
const ProductListTable = () => {
  const [data, setData] = useState<ProductRow[]>([])
  const [brands, setBrands] = useState<BrandSummary[]>([])
  const [categories, setCategories] = useState<CategorySummary[]>([])
  const [brandFilter, setBrandFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError(null)
    adminApi.products
      .catalog({
        limit: MAX_PAGE_SIZE,
        ...(brandFilter ? { brandId: brandFilter } : {}),
        ...(categoryFilter ? { categoryId: categoryFilter } : {})
      })
      .then(res => setData(res.items))
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [brandFilter, categoryFilter])

  useEffect(() => {
    adminApi.brands.list().then(setBrands).catch(() => undefined)
    adminApi.categories.list().then(setCategories).catch(() => undefined)
  }, [])

  const handleDelete = async (row: ProductRow) => {
    if (!window.confirm(`«${row.name}» غیرفعال شود؟`)) return

    try {
      await adminApi.products.remove(row.id)
      toast.success('محصول غیرفعال شد.')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : 'عملیات ناموفق بود.')
    }
  }

  const columns = useMemo<ColumnDef<ProductRow, any>[]>(
    () => [
      columnHelper.accessor('name', {
        header: 'محصول',
        cell: ({ row }) => (
          <div className='flex items-center gap-3'>
            <Avatar src={row.original.mainImageUrl ?? undefined} variant='rounded' alt={row.original.name}>
              {row.original.name.charAt(0)}
            </Avatar>
            <div className='flex flex-col items-start'>
              <Typography className='font-medium' color='text.primary'>
                {row.original.name}
              </Typography>
              {row.original.technicalCode && (
                <Typography variant='body2' className='ltr-slug' dir='ltr'>
                  {row.original.technicalCode}
                </Typography>
              )}
            </div>
          </div>
        )
      }),
      columnHelper.display({
        id: 'brand',
        header: 'برند',
        cell: ({ row }) => (row.original.brand ? <Chip size='small' variant='tonal' label={row.original.brand.name} /> : '—')
      }),
      columnHelper.display({
        id: 'category',
        header: 'دسته‌بندی',
        cell: ({ row }) => <Typography>{row.original.category?.name ?? '—'}</Typography>
      }),
      columnHelper.accessor('retailPrice', {
        header: 'قیمت خرده',
        cell: ({ row }) => <Typography dir='ltr'>{money(row.original.retailPrice)}</Typography>
      }),
      columnHelper.accessor('inStock', {
        header: 'موجودی',
        cell: ({ row }) =>
          row.original.inStock ? (
            <Chip size='small' color='success' variant='tonal' label='موجود' />
          ) : (
            <Chip size='small' color='error' variant='tonal' label='ناموجود' />
          )
      }),
      columnHelper.accessor('actions', {
        header: 'عملیات',
        cell: ({ row }) => (
          <div className='flex items-center'>
            <IconButton component={Link} href={`/apps/ecommerce/products/add?id=${row.original.id}`}>
              <i className='tabler-edit text-textSecondary' />
            </IconButton>
            <IconButton onClick={() => handleDelete(row.original)}>
              <i className='tabler-trash text-textSecondary' />
            </IconButton>
          </div>
        ),
        enableSorting: false
      })
    ],
    []
  )

  const table = useReactTable({
    data,
    columns,
    filterFns: { fuzzy: fuzzyFilter },
    state: { globalFilter },
    initialState: { pagination: { pageSize: 10 } },
    globalFilterFn: fuzzyFilter,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel()
  })

  return (
    <Card>
      <div className='flex flex-wrap items-center justify-between gap-4 p-6'>
        <Typography variant='h5'>محصولات</Typography>
        <Button component={Link} href='/apps/ecommerce/products/add' variant='contained' startIcon={<i className='tabler-plus' />}>
          افزودن محصول
        </Button>
      </div>
      <div className='flex flex-wrap items-center gap-4 p-6 pbs-0'>
        <CustomTextField
          select
          value={brandFilter}
          onChange={e => setBrandFilter(e.target.value)}
          className='is-[180px]'
          label='برند'
        >
          <MenuItem value=''>همه برندها</MenuItem>
          {brands.map(b => (
            <MenuItem key={b.id} value={b.id}>
              {b.name}
            </MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className='is-[180px]'
          label='دسته‌بندی'
        >
          <MenuItem value=''>همه دسته‌ها</MenuItem>
          {categories.map(c => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </CustomTextField>
      </div>
      <div className='flex flex-wrap justify-between gap-4 p-6 pbs-0'>
        <DebouncedInput value={globalFilter ?? ''} onChange={v => setGlobalFilter(v)} placeholder='جست‌وجو' className='max-sm:is-full' />
        <CustomTextField
          select
          value={table.getState().pagination.pageSize}
          onChange={e => table.setPageSize(Number(e.target.value))}
          className='flex-auto max-sm:is-full sm:is-[70px]'
        >
          <MenuItem value='10'>10</MenuItem>
          <MenuItem value='25'>25</MenuItem>
          <MenuItem value='50'>50</MenuItem>
        </CustomTextField>
      </div>
      {loadError && (
        <Alert severity='error' className='mx-6 mbe-4'>
          {loadError}
        </Alert>
      )}
      {loading ? (
        <div className='flex justify-center p-10'>
          <CircularProgress />
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className={tableStyles.table}>
            <thead>
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : (
                        <div
                          className={classnames({
                            'flex items-center': header.column.getIsSorted(),
                            'cursor-pointer select-none': header.column.getCanSort()
                          })}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <i className='tabler-chevron-up text-xl' />,
                            desc: <i className='tabler-chevron-down text-xl' />
                          }[header.column.getIsSorted() as 'asc' | 'desc'] ?? null}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            {table.getFilteredRowModel().rows.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={table.getVisibleFlatColumns().length} className='text-center'>
                    محصولی یافت نشد.
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {table
                  .getRowModel()
                  .rows.slice(0, table.getState().pagination.pageSize)
                  .map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            )}
          </table>
        </div>
      )}
      <TablePagination
        component={() => <TablePaginationComponent table={table} />}
        count={table.getFilteredRowModel().rows.length}
        rowsPerPage={table.getState().pagination.pageSize}
        page={table.getState().pagination.pageIndex}
        onPageChange={(_, page) => table.setPageIndex(page)}
      />
    </Card>
  )
}

export default ProductListTable
