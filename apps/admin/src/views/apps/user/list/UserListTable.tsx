'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import TablePagination from '@mui/material/TablePagination'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import type { TextFieldProps } from '@mui/material/TextField'

// Third-party Imports
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
import classnames from 'classnames'

// Type Imports
import type { UserRole } from '@edalat/shared'
import { MAX_PAGE_SIZE } from '@edalat/shared'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'
import TablePaginationComponent from '@components/TablePaginationComponent'

// Lib Imports
import { adminApi, ApiError, type AdminUserSummary } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'
import { USER_ROLE_LABELS, USER_ROLE_OPTIONS } from '@/lib/user-role'

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

type UserRow = AdminUserSummary

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

const columnHelper = createColumnHelper<UserRow>()

const date = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')
const fullName = (row: UserRow) => [row.firstName, row.lastName].filter(Boolean).join(' ') || '—'

/**
 * PRD §51 — admin user management table. Same reasoning as
 * `OrderListTable.tsx`: no `full-version` source is available in this
 * environment to copy from, so this reuses `ProductListTable.tsx`'s table
 * shell with user-domain columns. Role and active-state are edited inline
 * (select + switch, PATCHing `/users/admin/:id` immediately) rather than
 * through a separate drawer — there is nothing else on a user row worth a
 * multi-field form for.
 */
const UserListTable = () => {
  const [data, setData] = useState<UserRow[]>([])
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setLoadError(null)
    adminApi.users
      .listAdmin({ limit: MAX_PAGE_SIZE, ...(roleFilter ? { role: roleFilter } : {}) })
      .then(res => setData(res.items))
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [roleFilter])

  const handleRoleChange = async (row: UserRow, role: UserRole) => {
    setSavingId(row.id)

    try {
      const updated = await adminApi.users.update(row.id, { role })

      setData(prev => prev.map(u => (u.id === row.id ? updated : u)))
      toast.success('نقش کاربر تغییر کرد.')
    } catch (err) {
      if (err instanceof AuthRequiredError) toast.error('نشست شما منقضی شده؛ دوباره وارد شوید.')
      else toast.error(err instanceof ApiError || err instanceof Error ? err.message : 'تغییر نقش ناموفق بود.')
    } finally {
      setSavingId(null)
    }
  }

  const handleActiveToggle = async (row: UserRow) => {
    setSavingId(row.id)

    try {
      const updated = await adminApi.users.update(row.id, { isActive: !row.isActive })

      setData(prev => prev.map(u => (u.id === row.id ? updated : u)))
      toast.success(updated.isActive ? 'حساب کاربر فعال شد.' : 'حساب کاربر غیرفعال شد.')
    } catch (err) {
      if (err instanceof AuthRequiredError) toast.error('نشست شما منقضی شده؛ دوباره وارد شوید.')
      else toast.error(err instanceof ApiError || err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود.')
    } finally {
      setSavingId(null)
    }
  }

  const columns = useMemo<ColumnDef<UserRow, any>[]>(
    () => [
      columnHelper.display({
        id: 'name',
        header: 'کاربر',
        cell: ({ row }) => (
          <div className='flex flex-col items-start'>
            <Typography className='font-medium' color='text.primary'>
              {fullName(row.original)}
            </Typography>
            {row.original.companyName && (
              <Typography variant='body2' color='text.secondary'>
                {row.original.companyName}
              </Typography>
            )}
          </div>
        )
      }),
      columnHelper.accessor('phone', {
        header: 'تلفن',
        cell: ({ row }) => (
          <Typography dir='ltr' className='ltr-slug'>
            {row.original.phone}
          </Typography>
        )
      }),
      columnHelper.accessor(row => row.email ?? '', {
        id: 'email',
        header: 'ایمیل',
        cell: ({ row }) => (
          <Typography dir='ltr' className='ltr-slug'>
            {row.original.email ?? '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('role', {
        header: 'نقش',
        cell: ({ row }) => (
          <CustomTextField
            select
            size='small'
            disabled={savingId === row.original.id}
            value={row.original.role}
            onChange={e => handleRoleChange(row.original, e.target.value as UserRole)}
            className='is-[170px]'
          >
            {USER_ROLE_OPTIONS.map(role => (
              <MenuItem key={role} value={role}>
                {USER_ROLE_LABELS[role]}
              </MenuItem>
            ))}
          </CustomTextField>
        )
      }),
      columnHelper.accessor('isActive', {
        header: 'وضعیت حساب',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <Switch
              size='small'
              checked={row.original.isActive}
              disabled={savingId === row.original.id}
              onChange={() => handleActiveToggle(row.original)}
            />
            <Chip
              size='small'
              variant='tonal'
              color={row.original.isActive ? 'success' : 'error'}
              label={row.original.isActive ? 'فعال' : 'غیرفعال'}
            />
          </div>
        )
      }),
      columnHelper.accessor('createdAt', {
        header: 'تاریخ عضویت',
        cell: ({ row }) => <Typography>{date(row.original.createdAt)}</Typography>
      })
    ],
    [savingId]
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
        <Typography variant='h5'>کاربران</Typography>
      </div>
      <div className='flex flex-wrap items-center gap-4 p-6 pbs-0'>
        <CustomTextField
          select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className='is-[190px]'
          label='نقش'
        >
          <MenuItem value=''>همه نقش‌ها</MenuItem>
          {USER_ROLE_OPTIONS.map(role => (
            <MenuItem key={role} value={role}>
              {USER_ROLE_LABELS[role]}
            </MenuItem>
          ))}
        </CustomTextField>
      </div>
      <div className='flex flex-wrap justify-between gap-4 p-6 pbs-0'>
        <DebouncedInput
          value={globalFilter ?? ''}
          onChange={v => setGlobalFilter(v)}
          placeholder='جست‌وجو با نام، تلفن یا ایمیل'
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
                    کاربری یافت نشد.
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

export default UserListTable
