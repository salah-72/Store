// الموردين والعملاء نفس الشكل بالظبط، الفرق في الكلمات والـ API بس
export type Kind = 'suppliers' | 'customers'

export interface KindConfig {
  title: string
  single: string
  newLabel: string
  debtFilterParam: 'owed' | 'debtors'   // اسم الفلتر في السيرفر
  debtFilterLabel: string
  netLabel: string                      // صافي الفواتير (بعد المرتجع)
  paidLabel: string
  remainingLabel: string
  debitLabel: string                    // عمود الكشف: اللي زاد الرصيد
  owesLabel: string                     // لما الرصيد موجب
  creditLabel: string                   // لما الرصيد سالب
  openingHint: string
  paymentTitle: string
  paymentHint: string
  invoiceType: 'SALE' | 'PURCHASE'
  paymentField: 'supplierId' | 'customerId'
}

export const configs: Record<Kind, KindConfig> = {
  suppliers: {
    title: 'الموردين', single: 'المورد', newLabel: '+ مورد جديد',
    debtFilterParam: 'owed', debtFilterLabel: 'اللي ليهم فلوس عندي بس',
    netLabel: 'صافي التوريدات', paidLabel: 'المدفوع له', remainingLabel: 'المتبقي علينا', debitLabel: 'علينا', owesLabel: 'علينا له', creditLabel: 'ليا عنده',
    openingHint: 'لو عليك فلوس له من قبل السيستم اكتب المبلغ موجب. لو هو اللي عليه ليك اكتبه بالسالب (-).',
    paymentTitle: 'دفعة للمورد', paymentHint: 'فلوس بتدفعها للمورد (بتخرج من الخزنة)',
    invoiceType: 'PURCHASE', paymentField: 'supplierId',
  },
  customers: {
    title: 'العملاء', single: 'العميل', newLabel: '+ عميل جديد',
    debtFilterParam: 'debtors', debtFilterLabel: 'المدينين بس',
    netLabel: 'صافي مشترياته', paidLabel: 'المدفوع', remainingLabel: 'المتبقي عليه', debitLabel: 'عليه', owesLabel: 'عليه لينا', creditLabel: 'له عندنا',
    openingHint: 'لو العميل عليه فلوس من قبل السيستم اكتب المبلغ موجب. لو ليه فلوس عندك اكتبه بالسالب (-).',
    paymentTitle: 'دفعة من العميل', paymentHint: 'فلوس بتستلمها من العميل (بتدخل الخزنة)',
    invoiceType: 'SALE', paymentField: 'customerId',
  },
}

export const moveLabels: Record<string, string> = {
  SALE: 'فاتورة بيع', PURCHASE: 'فاتورة شراء', PAYMENT: 'دفعة', RETURN: 'مرتجع',
}
