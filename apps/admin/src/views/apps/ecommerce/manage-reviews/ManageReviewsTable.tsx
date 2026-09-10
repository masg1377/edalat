'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import Grid from '@mui/material/Grid2'
import Rating from '@mui/material/Rating'
import TablePagination from '@mui/material/TablePagination'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
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
import type { ReviewStatus } from '@edalat/shared'

// Component Imports
import CustomTextField from '@core/components/mui/TextField'
import OptionMenu from '@core/components/option-menu'
import TablePaginationComponent from '@components/TablePaginationComponent'

// Lib Imports
import { adminApi, ApiError, type AdminReviewStats, type AdminReviewSummary } from '@/lib/api'
import { AuthRequiredError } from '@/lib/auth'
import { REVIEW_STATUS_COLORS, REVIEW_STATUS_LABELS, REVIEW_STATUS_OPTIONS } from '@/lib/review-status'

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

type ReviewRow = AdminReviewSummary & { actions?: string }

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

const date = (iso: string) => new Date(iso).toLocaleDateString('fa-IR')

const columnHelper = createColumnHelper<ReviewRow>()

/**
 * PRD §36/§56 (فاز ۹د) — real-data replacement for full-version's
 * `TotalReviews`/`ReviewsStatistics` (which show a hardcoded rating
 * breakdown and a fake weekly bar chart, per Rule 7/§77 "no hardcoded
 * data"). `stats` comes straight from `GET /reviews/admin`.
 */
const SummaryCards = ({ stats }: { stats: AdminReviewStats }) => (
  <Grid container spacing={6} className='mbe-6'>
    <Grid size={{ xs: 12, sm: 4 }}>
      <Card>
        <div className='flex flex-col gap-1 p-6'>
          <Typography color='text.secondary'>میانگین امتیاز نظرات تأییدشده</Typography>
          <div className='flex items-center gap-2'>
            <Typography variant='h3'>{stats.approvedAverageRating.toFixed(1)}</Typography>
            <Rating value={stats.approvedAverageRating} precision={0.1} readOnly size='small' />
          </div>
          <Typography variant='body2' color='text.secondary'>
            از {stats.approvedCount.toLocaleString('fa-IR')} نظر تأییدشده
          </Typography>
        </div>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, sm: 4 }}>
      <Card>
        <div className='flex flex-col gap-1 p-6'>
          <Typography color='text.secondary'>در انتظار بررسی</Typography>
          <Typography variant='h3' color='warning.main'>
            {(stats.byStatus.PENDING ?? 0).toLocaleString('fa-IR')}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            از مجموع {stats.total.toLocaleString('fa-IR')} نظر
          </Typography>
        </div>
      </Card>
    </Grid>
    <Grid size={{ xs: 12, sm: 4 }}>
      <Card>
        <div className='flex flex-col gap-1 p-6'>
          <Typography color='text.secondary'>ردشده / مخفی‌شده</Typography>
          <Typography variant='h3' color='error.main'>
            {((stats.byStatus.REJECTED ?? 0) + (stats.byStatus.HIDDEN ?? 0)).toLocaleString('fa-IR')}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            {(stats.byStatus.REJECTED ?? 0).toLocaleString('fa-IR')} رد ·{' '}
            {(stats.byStatus.HIDDEN ?? 0).toLocaleString('fa-IR')} مخفی
          </Typography>
        </div>
      </Card>
    </Grid>
  </Grid>
)

/** Status + adminNote editor — covers both quick moderation and leaving a note. */
const EditReviewDialog = ({
  review,
  onClose,
  onSaved
}: {
  review: AdminReviewSummary
  onClose: () => void
  onSaved: (updated: AdminReviewSummary) => void
}) => {
  const [status, setStatus] = useState<ReviewStatus>(review.status)
  const [adminNote, setAdminNote] = useState(review.adminNote ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)

    try {
      const updated = await adminApi.reviews.update(review.id, { status, adminNote })

      toast.success('تغییرات نظر ذخیره شد.')
      onSaved(updated)
    } catch (err) {
      if (err instanceof AuthRequiredError) setError('نشست شما منقضی شده؛ دوباره وارد شوید.')
      else if (err instanceof ApiError || err instanceof Error) setError(err.message)
      else setError('ذخیره تغییرات ناموفق بود.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>بررسی نظر — {review.product.name}</DialogTitle>
      <DialogContent className='flex flex-col gap-4'>
        {error && <Alert severity='error'>{error}</Alert>}
        <div className='flex items-center gap-2'>
          <Rating value={review.rating} readOnly size='small' />
          <Typography variant='body2' color='text.secondary'>
            {review.userName} · <span dir='ltr'>{review.userPhone}</span>
          </Typography>
        </div>
        {review.title && <Typography className='font-medium'>{review.title}</Typography>}
        {review.comment && <Typography color='text.secondary'>{review.comment}</Typography>}
        <CustomTextField
          select
          fullWidth
          label='وضعیت'
          value={status}
          onChange={e => setStatus(e.target.value as ReviewStatus)}
        >
          {REVIEW_STATUS_OPTIONS.map(s => (
            <MenuItem key={s} value={s}>
              {REVIEW_STATUS_LABELS[s]}
            </MenuItem>
          ))}
        </CustomTextField>
        <CustomTextField
          fullWidth
          multiline
          minRows={3}
          label='یادداشت داخلی (اختیاری)'
          value={adminNote}
          onChange={e => setAdminNote(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='secondary'>
          انصراف
        </Button>
        <Button variant='contained' onClick={() => void save()} disabled={saving}>
          {saving ? 'در حال ذخیره…' : 'ذخیره'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

/**
 * PRD §36/§56 (فاز ۹د) — admin review-moderation queue. Copied from
 * `full-version/.../manage-reviews/ManageReviewsTable.tsx` per the project
 * rule (کپی، نه بازطراحی) but wired to `GET/PATCH /reviews/admin*` instead
 * of the demo's static `reviewsData`, and following the real-API table
 * pattern `ManufacturingRequestListTable.tsx` established in فاز ۹ج (server
 * status filter + client fuzzy search over the fetched page + DataTable).
 * Quick actions (Approve/Reject/Hide) PATCH status directly; "ویرایش و
 * یادداشت" opens `EditReviewDialog` for status + `adminNote` together.
 */
const ManageReviewsTable = () => {
  const [data, setData] = useState<ReviewRow[]>([])
  const [stats, setStats] = useState<AdminReviewStats | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [globalFilter, setGlobalFilter] = useState('')
  const [editing, setEditing] = useState<AdminReviewSummary | null>(null)

  const load = () => {
    setLoading(true)
    setLoadError(null)
    adminApi.reviews
      .listAdmin({ limit: 100, ...(statusFilter ? { status: statusFilter } : {}) })
      .then(res => {
        setData(res.items)
        setStats(res.stats)
      })
      .catch(err => setLoadError(err instanceof ApiError || err instanceof Error ? err.message : 'خطا در دریافت اطلاعات'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const quickUpdate = async (id: string, status: ReviewStatus) => {
    try {
      await adminApi.reviews.update(id, { status })
      toast.success('وضعیت نظر به‌روزرسانی شد.')
      load()
    } catch (err) {
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : 'به‌روزرسانی ناموفق بود.')
    }
  }

  const columns = useMemo<ColumnDef<ReviewRow, any>[]>(
    () => [
      columnHelper.accessor('product', {
        header: 'محصول',
        cell: ({ row }) => (
          <Typography className='font-medium' color='text.primary'>
            {row.original.product.name}
          </Typography>
        )
      }),
      columnHelper.accessor('userName', {
        header: 'کاربر',
        cell: ({ row }) => (
          <div className='flex flex-col items-start'>
            <Typography color='text.primary'>{row.original.userName}</Typography>
            <Typography variant='body2' color='text.secondary' dir='ltr'>
              {row.original.userPhone}
            </Typography>
            {row.original.isVerifiedPurchase && (
              <Chip label='خرید تأییدشده' size='small' color='success' variant='tonal' className='mbs-1' />
            )}
          </div>
        )
      }),
      columnHelper.accessor('comment', {
        header: 'نظر',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <Rating value={row.original.rating} readOnly size='small' />
            {row.original.title && (
              <Typography className='font-medium' color='text.primary'>
                {row.original.title}
              </Typography>
            )}
            {row.original.comment && (
              <Typography variant='body2' className='text-wrap' style={{ maxInlineSize: 280 }}>
                {row.original.comment}
              </Typography>
            )}
          </div>
        )
      }),
      columnHelper.accessor('status', {
        header: 'وضعیت',
        cell: ({ row }) => (
          <Chip
            size='small'
            variant='tonal'
            color={REVIEW_STATUS_COLORS[row.original.status]}
            label={REVIEW_STATUS_LABELS[row.original.status]}
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
          <OptionMenu
            iconButtonProps={{ size: 'medium' }}
            iconClassName='text-textSecondary'
            options={[
              {
                text: 'تأیید',
                icon: 'tabler-check',
                menuItemProps: {
                  onClick: () => void quickUpdate(row.original.id, 'APPROVED' as ReviewStatus),
                  className: 'flex items-center gap-2'
                }
              },
              {
                text: 'رد',
                icon: 'tabler-x',
                menuItemProps: {
                  onClick: () => void quickUpdate(row.original.id, 'REJECTED' as ReviewStatus),
                  className: 'flex items-center gap-2'
                }
              },
              {
                text: 'مخفی‌کردن',
                icon: 'tabler-eye-off',
                menuItemProps: {
                  onClick: () => void quickUpdate(row.original.id, 'HIDDEN' as ReviewStatus),
                  className: 'flex items-center gap-2'
                }
              },
              {
                text: 'ویرایش و یادداشت',
                icon: 'tabler-note',
                menuItemProps: {
                  onClick: () => setEditing(row.original),
                  className: 'flex items-center gap-2'
                }
              }
            ]}
          />
        ),
        enableSorting: false
      })
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
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
    <>
      {stats && <SummaryCards stats={stats} />}
      <Card>
        <div className='flex flex-wrap items-center justify-between gap-4 p-6'>
          <Typography variant='h5'>مدیریت نظرات کاربران</Typography>
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
            {REVIEW_STATUS_OPTIONS.map(status => (
              <MenuItem key={status} value={status}>
                {REVIEW_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </CustomTextField>
        </div>
        <div className='flex flex-wrap justify-between gap-4 p-6 pbs-0'>
          <DebouncedInput
            value={globalFilter ?? ''}
            onChange={v => setGlobalFilter(v)}
            placeholder='جست‌وجو در نام محصول یا کاربر'
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
                      نظری یافت نشد.
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

      {editing && (
        <EditReviewDialog
          review={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </>
  )
}

export default ManageReviewsTable
