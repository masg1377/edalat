'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import Link from 'next/link'

// MUI Imports
import Card from '@mui/material/Card'
import IconButton from '@mui/material/IconButton'
import TablePagination from '@mui/material/TablePagination'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import type { TextFieldProps } from '@mui/material/TextField'

// Third-party Imports
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
import classnames from 'classnames'

// Type Imports
import type { OrderStatus } from '@edalat/shared'
import { MAX_PAGE_SIZE } from '@edalat/shared'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

// Lib Imports
import { adminApi, ApiError, type AdminOrderSummary } from '@/lib/api'
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '@/lib/order-status'

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

type OrderRow = AdminOrderSummary & { actions?: string }

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

const columnHelper = createColumnHelper<OrderRow>()

const money = (n: number) => `${n.toLocaleString('fa-IR')} تومان`
const date = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')

/**
 * PRD §31/§57 — admin order management table. No direct Vuexy equivalent
 * exists in `starter-kit` (no `full-version` source is available in this
 * environment to copy from — see `claude/وضعیت-پیاده‌سازی.md`, فاز ۹ب), so
 * this reuses `ProductListTable.tsx`'s exact table shell (search box,
 * status/date filters, DataTable, TablePaginationComponent) with the real
 * `GET /orders/admin` fetch and order-domain columns, "دقیقاً همون الگو".
 *
 * Filters (status, date range) are sent to the API and re-fetch; the order
 * number / customer search box is a client-side fuzzy filter over the
 * already-fetched page, same tradeoff `ProductListTable`/`VehicleTable`
 * already accept (bounded fetch, not true server pagination — see the
 * `catalog()` doc comment in `lib/api.ts`).
 */
const OrderListTable = () => {
  const [data, setData] = useState<OrderRow[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError(null)
    adminApi.orders
      .listAdmin({
        limit: MAX_PAGE_SIZE,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {})
      })
      .then(res => setData(res.items))
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter, dateFrom, dateTo])

  const columns = useMemo<ColumnDef<OrderRow, any>[]>(
    () => [
      columnHelper.accessor('orderNumber', {
        header: 'سفارش',
        cell: ({ row }) => (
          <div className='flex flex-col items-start'>
            <Typography className='font-medium' color='text.primary' dir='ltr'>
              {row.original.orderNumber}
            </Typography>
            <Typography variant='body2' color='text.secondary'>
              {row.original.customerName ?? '—'} ·{' '}
              <span dir='ltr' className='ltr-slug'>
                {row.original.customerPhone}
              </span>
            </Typography>
          </div>
        )
      }),
      columnHelper.accessor('status', {
        header: 'وضعیت',
        cell: ({ row }) => (
          <Chip
            size='small'
            variant='tonal'
            color={ORDER_STATUS_COLORS[row.original.status]}
            label={ORDER_STATUS_LABELS[row.original.status]}
          />
        )
      }),
      columnHelper.accessor('itemCount', {
        header: 'تعداد اقلام',
        cell: ({ row }) => <Typography>{row.original.itemCount}</Typography>
      }),
      columnHelper.accessor('grandTotal', {
        header: 'مبلغ نهایی',
        cell: ({ row }) => <Typography dir='ltr'>{money(row.original.grandTotal)}</Typography>
      }),
      columnHelper.accessor('createdAt', {
        header: 'تاریخ ثبت',
        cell: ({ row }) => <Typography>{date(row.original.createdAt)}</Typography>
      }),
      columnHelper.accessor('actions', {
        header: 'عملیات',
        cell: ({ row }) => (
          <IconButton component={Link} href={`/apps/ecommerce/orders/details/${row.original.id}`}>
            <i className='tabler-eye text-textSecondary' />
          </IconButton>
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
        <Typography variant='h5'>سفارش‌ها</Typography>
      </div>
      <div className='flex flex-wrap items-center gap-4 p-6 pbs-0'>
        <CustomTextField
          select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='is-[180px]'
          label='وضعیت'
        >
          <MenuItem value=''>همه وضعیت‌ها</MenuItem>
          {ORDER_STATUS_OPTIONS.map((status: OrderStatus) => (
            <MenuItem key={status} value={status}>
              {ORDER_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          type='date'
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className='is-[170px]'
          label='از تاریخ'
          InputLabelProps={{ shrink: true }}
        />
        <CustomTextField
          type='date'
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className='is-[170px]'
          label='تا تاریخ'
          InputLabelProps={{ shrink: true }}
        />
      </div>
      <div className='flex flex-wrap justify-between gap-4 p-6 pbs-0'>
        <DebouncedInput
          value={globalFilter ?? ''}
          onChange={v => setGlobalFilter(v)}
          placeholder='جست‌وجو در شماره سفارش یا مشتری'
          className='max-sm:is-full sm:is-[320px]'
        />
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
                    سفارشی یافت نشد.
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

export default OrderListTable
