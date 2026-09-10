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
import type { ManufacturingStatus } from '@edalat/shared'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

// Lib Imports
import { adminApi, ApiError, type AdminManufacturingSummary } from '@/lib/api'
import {
  MANUFACTURING_STATUS_COLORS,
  MANUFACTURING_STATUS_LABELS,
  MANUFACTURING_STATUS_OPTIONS
} from '@/lib/manufacturing-status'

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

type RequestRow = AdminManufacturingSummary & { actions?: string }

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

const columnHelper = createColumnHelper<RequestRow>()

const date = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')

/**
 * PRD §28/§55 (فاز ۹ج) — admin manufacturing-request queue table. No direct
 * Vuexy equivalent exists for this domain-specific queue (طبق یادداشت پرامپت
 * فاز ۹ج)، پس دقیقاً همان الگوی `OrderListTable.tsx` (فیلتر وضعیت سمت سرور،
 * جست‌وجوی fuzzy سمت کلاینت روی صفحهٔ فچ‌شده، DataTable،
 * TablePaginationComponent) با فچ واقعی `GET /manufacturing/requests/admin`
 * و ستون‌های دامنهٔ تولید بازاستفاده شده — کامپوننت جدید طراحی نشده.
 */
const ManufacturingRequestListTable = () => {
  const [data, setData] = useState<RequestRow[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')

  const load = () => {
    setLoading(true)
    setLoadError(null)
    adminApi.manufacturing
      .listAdmin({ limit: 100, ...(statusFilter ? { status: statusFilter } : {}) })
      .then(res => setData(res.items))
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const columns = useMemo<ColumnDef<RequestRow, any>[]>(
    () => [
      columnHelper.accessor('referenceNumber', {
        header: 'شماره مرجع',
        cell: ({ row }) => (
          <Typography className='font-medium' color='text.primary' dir='ltr'>
            {row.original.referenceNumber}
          </Typography>
        )
      }),
      columnHelper.accessor('contactName', {
        header: 'نام تماس / شرکت',
        cell: ({ row }) => (
          <div className='flex flex-col items-start'>
            <Typography color='text.primary'>{row.original.contactName}</Typography>
            {row.original.companyName && (
              <Typography variant='body2' color='text.secondary'>
                {row.original.companyName}
              </Typography>
            )}
          </div>
        )
      }),
      columnHelper.accessor('productType', {
        header: 'نوع محصول',
        cell: ({ row }) => <Typography>{row.original.productType}</Typography>
      }),
      columnHelper.accessor('quantity', {
        header: 'تعداد',
        cell: ({ row }) => <Typography dir='ltr'>{row.original.quantity.toLocaleString('fa-IR')}</Typography>
      }),
      columnHelper.accessor('status', {
        header: 'وضعیت',
        cell: ({ row }) => (
          <Chip
            size='small'
            variant='tonal'
            color={MANUFACTURING_STATUS_COLORS[row.original.status]}
            label={MANUFACTURING_STATUS_LABELS[row.original.status]}
          />
        )
      }),
      columnHelper.accessor('createdAt', {
        header: 'تاریخ ثبت',
        cell: ({ row }) => <Typography>{date(row.original.createdAt)}</Typography>
      }),
      columnHelper.accessor('actions', {
        header: 'عملیات',
        cell: ({ row }) => (
          <IconButton component={Link} href={`/apps/requests/manufacturing/details/${row.original.id}`}>
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
        <Typography variant='h5'>درخواست‌های تولید با برند اختصاصی</Typography>
      </div>
      <div className='flex flex-wrap items-center gap-4 p-6 pbs-0'>
        <CustomTextField
          select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className='is-[220px]'
          label='وضعیت'
        >
          <MenuItem value=''>همه وضعیت‌ها</MenuItem>
          {MANUFACTURING_STATUS_OPTIONS.map((status: ManufacturingStatus) => (
            <MenuItem key={status} value={status}>
              {MANUFACTURING_STATUS_LABELS[status]}
            </MenuItem>
          ))}
        </CustomTextField>
      </div>
      <div className='flex flex-wrap justify-between gap-4 p-6 pbs-0'>
        <DebouncedInput
          value={globalFilter ?? ''}
          onChange={v => setGlobalFilter(v)}
          placeholder='جست‌وجو در شماره مرجع، نام تماس یا شرکت'
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
                    درخواستی یافت نشد.
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

export default ManufacturingRequestListTable
