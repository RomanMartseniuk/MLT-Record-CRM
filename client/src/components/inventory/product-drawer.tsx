/**
 * The product card: stock numbers, store links, batches with prices and the
 * history of where the product went.
 *
 * Opened from the warehouse page. All data comes from the API (`useProduct`);
 * the card never reads or computes stock itself.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Plus } from 'lucide-react'
import { useProduct, useSession, useUpdateProduct } from '@/api'
import type { Product } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Field, Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableWrap,
} from '@/components/ui/table'
import { ErrorNote } from '@/components/common/page'
import { PhotoTile } from '@/components/common/stat'
import { formatDate, formatMoney, formatQty } from '@/lib/format'
import { useSingleFlight } from '@/lib/use-single-flight'
import { uid } from '@/lib/utils'
import { useUi } from '@/store/ui-context'

/** `product` is the row the user clicked; fresher data comes from the detail query. */
export function ProductDrawer({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data: detail } = useProduct(product.id)
  const updateProduct = useUpdateProduct()
  const { can } = useSession()
  const { toast } = useUi()
  const { run, pending } = useSingleFlight()

  const [linkLabel, setLinkLabel] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [error, setError] = useState('')

  // After a link is added the detail refetches; show its fresher product, not the clicked row.
  const current = detail?.stock.product ?? product
  const stock = detail?.stock
  const canManage = can('inventory.manage')

  /** Adds a store link to the product. */
  const addLink = () =>
    run(async () => {
      if (!linkLabel.trim() || !linkUrl.trim()) {
        setError('Заповніть підпис і адресу посилання.')
        return
      }
      const links = [...current.links, { id: uid('lnk'), label: linkLabel.trim(), url: linkUrl.trim() }]
      const result = await updateProduct.mutateAsync({ id: current.id, patch: { links } })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setLinkLabel('')
      setLinkUrl('')
      setError('')
      toast('Посилання додано', { tone: 'success' })
    })

  const removeLink = (linkId: string) =>
    run(async () => {
      const links = current.links.filter((link) => link.id !== linkId)
      const result = await updateProduct.mutateAsync({ id: current.id, patch: { links } })
      if (!result.ok) setError(result.error)
    })

  return (
    <Dialog
      open
      onClose={onClose}
      title={current.name}
      description={stock ? `${stock.categoryName} · ${current.unit}` : current.unit}
      width="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Закрити
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-4">
          <PhotoTile tone={current.photoTone} name={current.name} size="lg" />
          {stock ? (
            <div className="grid flex-1 gap-2 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Залишок</p>
                <p className="text-lg font-semibold tabular-nums">{formatQty(stock.qty, current.unit)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Середня ціна</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(stock.avgPriceKop)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Вартість залишку</p>
                <p className="text-lg font-semibold tabular-nums">{formatMoney(stock.valueKop)}</p>
              </div>
            </div>
          ) : (
            <Skeleton className="h-14 flex-1" />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Посилання на магазини</p>
          {current.links.length === 0 ? (
            <p className="text-xs text-muted-foreground">Посилань ще немає.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {current.links.map((link) => (
                <div key={link.id} className="flex items-center gap-2 rounded-md border border-border p-2">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex min-w-0 flex-1 items-center gap-2 text-sm hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="shrink-0">{link.label}</span>
                    <span className="truncate text-xs text-muted-foreground">{link.url}</span>
                  </a>
                  {canManage ? (
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => void removeLink(link.id)}>
                      Прибрати
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {canManage ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Field label="Підпис" className="sm:w-40">
                <Input value={linkLabel} onChange={(event) => setLinkLabel(event.target.value)} placeholder="Rozetka" />
              </Field>
              <Field label="Адреса" className="min-w-0 flex-1">
                <Input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" />
              </Field>
              <Button variant="outline" disabled={pending} onClick={() => void addLink()}>
                <Plus />
                Додати
              </Button>
            </div>
          ) : null}
          <ErrorNote>{error}</ErrorNote>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Партії та ціни</p>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Надійшла</TableHead>
                  <TableHead>Закупівля</TableHead>
                  <TableHead className="text-right">Прийшло</TableHead>
                  <TableHead className="text-right">Залишок</TableHead>
                  <TableHead className="text-right">Ціна за од.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!detail ? (
                  <TableEmpty colSpan={5}>Завантаження…</TableEmpty>
                ) : detail.batches.length === 0 ? (
                  <TableEmpty colSpan={5}>Партій ще не було</TableEmpty>
                ) : (
                  detail.batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="text-muted-foreground">{formatDate(batch.receivedAt)}</TableCell>
                      <TableCell>
                        {batch.purchaseNumber ? (
                          <Link to={`/purchases/${batch.purchaseId}`} className="hover:underline">
                            {batch.purchaseNumber}
                          </Link>
                        ) : (
                          <Badge variant="outline">коригування</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(batch.qtyReceived, current.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(batch.qtyRemaining, current.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(batch.unitPriceKop)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Використання по заявках</p>
          <TableWrap>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Заявка</TableHead>
                  <TableHead className="text-right">К-сть</TableHead>
                  <TableHead className="text-right">Сума</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!detail ? (
                  <TableEmpty colSpan={5}>Завантаження…</TableEmpty>
                ) : detail.usage.length === 0 ? (
                  <TableEmpty colSpan={5}>Товар ще не використовувався</TableEmpty>
                ) : (
                  detail.usage.map(({ allocation, orderNumber }) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="text-muted-foreground">{formatDate(allocation.createdAt)}</TableCell>
                      <TableCell>
                        {orderNumber ? (
                          <Link to={`/orders/${allocation.orderId}`} className="hover:underline">
                            № {orderNumber}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatQty(allocation.qty, current.unit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMoney(allocation.totalKop)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {allocation.status === 'active' ? 'активне' : 'повернуто або скасовано'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableWrap>
        </div>
      </div>
    </Dialog>
  )
}
