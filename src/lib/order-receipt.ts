import type { jsPDF } from 'jspdf'
import type { Order } from '@/lib/services/orders'
import { getItemQuantity, getItemUnitPrice } from '@/lib/order-items'

const PAGE_WIDTH_MM = 80
const MARGIN_MM = 8
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_MM * 2
const LOGO_WIDTH_MM = 16
const BASE_LINE_MM = 3.8
const SMALL_LINE_MM = 3.2

const LABELS = {
  orderNumber: 'Order#',
  date: 'Date',
  type: 'Type',
  cashier: 'Cashier',
  customer: 'Customer',
  guests: 'Guests',
  subtotal: 'Subtotal',
  discount: 'Discount',
  tax: 'Tax',
  serviceCharge: 'Service Charge',
  rounding: 'Rounding',
  total: 'TOTAL',
  change: 'Change',
  footer: 'Terima kasih atas kunjungan Anda',
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  dine_in: 'Dine In',
  takeaway: 'Takeaway',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  qris: 'QRIS',
  transfer: 'Transfer',
}

type Block =
  | { kind: 'logo'; height: number; dataUrl: string; widthMm: number; heightMm: number }
  | { kind: 'centered'; height: number; text: string; size: number; style: 'normal' | 'bold' }
  | { kind: 'separator'; height: number }
  | {
      kind: 'row'
      height: number
      left: string
      right: string
      size: number
      style: 'normal' | 'bold'
      gray?: boolean
    }
  | {
      kind: 'text'
      height: number
      lines: Array<string>
      size: number
      style: 'normal' | 'bold' | 'italic'
      indent: number
      gray?: boolean
    }

interface LogoImage {
  dataUrl: string
  widthMm: number
  heightMm: number
}

function text(value: unknown): string {
  return String(value ?? '')
}

function formatIDR(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\u00a0/g, ' ')
}

function formatQuantity(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-'
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 })
    .format(value)
    .replace(/\u00a0/g, ' ')
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function wrap(
  probe: jsPDF,
  content: string,
  size: number,
  style: 'normal' | 'bold' | 'italic',
  indent: number,
): Array<string> {
  probe.setFont('helvetica', style)
  probe.setFontSize(size)
  return probe.splitTextToSize(content, CONTENT_WIDTH_MM - indent) as Array<string>
}

async function loadLogo(): Promise<LogoImage | null> {
  try {
    const image = new Image()
    image.src = '/logo.png'
    await image.decode()
    const targetWidthPx = 400
    const scale = targetWidthPx / image.naturalWidth
    const canvas = document.createElement('canvas')
    canvas.width = targetWidthPx
    canvas.height = Math.round(image.naturalHeight * scale)
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return {
      dataUrl: canvas.toDataURL('image/png'),
      widthMm: LOGO_WIDTH_MM,
      heightMm: (LOGO_WIDTH_MM * canvas.height) / canvas.width,
    }
  } catch (error) {
    console.warn('[order-receipt] failed to load or downscale logo', error)
    return null
  }
}

function buildBlocks(order: Order, logo: LogoImage | null, probe: jsPDF): Array<Block> {
  const blocks: Array<Block> = []

  if (logo) {
    blocks.push({
      kind: 'logo',
      height: logo.heightMm + 2,
      dataUrl: logo.dataUrl,
      widthMm: logo.widthMm,
      heightMm: logo.heightMm,
    })
  }

  blocks.push({
    kind: 'centered',
    height: 5,
    text: text(order.branch_name),
    size: 9.5,
    style: 'bold',
  })

  blocks.push({ kind: 'separator', height: 4 })

  const infoRows: Array<[string, string]> = [
    [LABELS.orderNumber, text(order.order_number)],
    [LABELS.date, formatDate(order.created_at)],
    [
      LABELS.type,
      `${ORDER_TYPE_LABELS[order.order_type] || text(order.order_type)}${
        order.table_number ? ` · Table ${text(order.table_number)}` : ''
      }`,
    ],
    [LABELS.cashier, text(order.cashier_name)],
  ]
  if (order.customer_name) {
    infoRows.push([LABELS.customer, text(order.customer_name)])
  }
  if (order.guest_count > 0) {
    infoRows.push([LABELS.guests, String(order.guest_count)])
  }
  for (const [label, value] of infoRows) {
    blocks.push({
      kind: 'row',
      height: BASE_LINE_MM,
      left: label,
      right: value,
      size: 7.5,
      style: 'normal',
    })
  }

  blocks.push({ kind: 'separator', height: 4 })

  for (const item of order.items ?? []) {
    const itemName = text(item.menu_item_name)
    const nameText = item.is_voided ? `[VOID] ${itemName}` : itemName
    const nameLines = wrap(probe, nameText, 7.5, 'bold', 0)
    blocks.push({
      kind: 'text',
      height: nameLines.length * BASE_LINE_MM,
      lines: nameLines,
      size: 7.5,
      style: 'bold',
      indent: 0,
      gray: item.is_voided,
    })

    blocks.push({
      kind: 'row',
      height: BASE_LINE_MM,
      left: `  ${formatQuantity(getItemQuantity(item))} ${text(
        item.unit_of_measure,
      )} x ${formatIDR(getItemUnitPrice(item))}`,
      right: formatIDR(item.subtotal),
      size: 7,
      style: 'normal',
      gray: item.is_voided,
    })

    for (const modifier of item.modifiers ?? []) {
      const suffix =
        modifier.extra_price > 0 ? ` (+${formatIDR(modifier.extra_price)})` : ''
      const lines = wrap(probe, `+ ${text(modifier.modifier_name)}${suffix}`, 6.5, 'normal', 3)
      blocks.push({
        kind: 'text',
        height: lines.length * SMALL_LINE_MM,
        lines,
        size: 6.5,
        style: 'normal',
        indent: 3,
        gray: true,
      })
    }

    if (item.notes) {
      const lines = wrap(probe, text(item.notes), 6.5, 'italic', 3)
      blocks.push({
        kind: 'text',
        height: lines.length * SMALL_LINE_MM,
        lines,
        size: 6.5,
        style: 'italic',
        indent: 3,
        gray: true,
      })
    }
  }

  blocks.push({ kind: 'separator', height: 4 })

  blocks.push({
    kind: 'row',
    height: BASE_LINE_MM,
    left: LABELS.subtotal,
    right: formatIDR(order.subtotal),
    size: 7.5,
    style: 'normal',
  })
  if (order.discount_amount > 0) {
    blocks.push({
      kind: 'row',
      height: BASE_LINE_MM,
      left: LABELS.discount,
      right: `-${formatIDR(order.discount_amount)}`,
      size: 7.5,
      style: 'normal',
    })
  }
  blocks.push({
    kind: 'row',
    height: BASE_LINE_MM,
    left: LABELS.tax,
    right: formatIDR(order.tax_amount),
    size: 7.5,
    style: 'normal',
  })
  blocks.push({
    kind: 'row',
    height: BASE_LINE_MM,
    left: LABELS.serviceCharge,
    right: formatIDR(order.service_charge),
    size: 7.5,
    style: 'normal',
  })
  if (order.rounding_amount !== 0) {
    blocks.push({
      kind: 'row',
      height: BASE_LINE_MM,
      left: LABELS.rounding,
      right: formatIDR(order.rounding_amount),
      size: 7.5,
      style: 'normal',
    })
  }
  blocks.push({
    kind: 'row',
    height: 5,
    left: LABELS.total,
    right: formatIDR(order.total),
    size: 9,
    style: 'bold',
  })

  const payments = order.payments ?? []
  if (payments.length > 0) {
    blocks.push({ kind: 'separator', height: 4 })
    for (const payment of payments) {
      blocks.push({
        kind: 'row',
        height: BASE_LINE_MM,
        left: text(
          PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method,
        ),
        right: formatIDR(payment.amount),
        size: 7.5,
        style: 'normal',
      })
      if (payment.change_amount > 0) {
        blocks.push({
          kind: 'row',
          height: BASE_LINE_MM,
          left: LABELS.change,
          right: formatIDR(payment.change_amount),
          size: 7.5,
          style: 'normal',
          gray: true,
        })
      }
    }
  }

  blocks.push({ kind: 'separator', height: 4 })
  blocks.push({
    kind: 'centered',
    height: 4,
    text: LABELS.footer,
    size: 7,
    style: 'normal',
  })

  return blocks
}

function paint(doc: jsPDF, blocks: Array<Block>): void {
  let y = MARGIN_MM
  for (const block of blocks) {
    switch (block.kind) {
      case 'logo': {
        const x = (PAGE_WIDTH_MM - block.widthMm) / 2
        doc.addImage(block.dataUrl, 'PNG', x, y, block.widthMm, block.heightMm)
        break
      }
      case 'centered': {
        doc.setFont('helvetica', block.style)
        doc.setFontSize(block.size)
        doc.setTextColor(0)
        doc.text(block.text, PAGE_WIDTH_MM / 2, y + block.height - 1.3, {
          align: 'center',
        })
        break
      }
      case 'separator': {
        doc.setDrawColor(150)
        doc.setLineDashPattern([0.6, 0.6], 0)
        doc.line(MARGIN_MM, y + block.height / 2, PAGE_WIDTH_MM - MARGIN_MM, y + block.height / 2)
        doc.setLineDashPattern([], 0)
        break
      }
      case 'row': {
        doc.setFont('helvetica', block.style)
        doc.setFontSize(block.size)
        doc.setTextColor(block.gray ? 110 : 0)
        const baseline = y + block.height - 1.3
        doc.text(block.left, MARGIN_MM, baseline)
        doc.text(block.right, PAGE_WIDTH_MM - MARGIN_MM, baseline, { align: 'right' })
        break
      }
      case 'text': {
        doc.setFont('helvetica', block.style)
        doc.setFontSize(block.size)
        doc.setTextColor(block.gray ? 110 : 0)
        const lineHeight = block.height / block.lines.length
        block.lines.forEach((line, index) => {
          doc.text(line, MARGIN_MM + block.indent, y + (index + 1) * lineHeight - 1.3)
        })
        break
      }
    }
    y += block.height
  }
}

export async function buildOrderReceipt(order: Order): Promise<jsPDF> {
  const { jsPDF: JsPDF } = await import('jspdf')
  const logo = await loadLogo()
  const probe = new JsPDF({ unit: 'mm', format: [PAGE_WIDTH_MM, 297] })
  const blocks = buildBlocks(order, logo, probe)
  const contentHeight = blocks.reduce((total, block) => total + block.height, 0)
  const doc = new JsPDF({
    unit: 'mm',
    format: [PAGE_WIDTH_MM, MARGIN_MM * 2 + contentHeight],
  })
  doc.setProperties({ title: `Receipt ${order.order_number}` })
  paint(doc, blocks)
  return doc
}

export async function downloadOrderReceipt(order: Order): Promise<void> {
  const doc = await buildOrderReceipt(order)
  doc.save(`receipt-${order.order_number}.pdf`)
}
