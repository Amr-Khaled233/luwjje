/**
 * The 27 Egyptian governorates, with a starting delivery price per zone.
 * Every price is editable from Dashboard → Shipping; these are only defaults
 * so the store can take an order the moment it is seeded.
 */
export const GOVERNORATES: {
  name: string;
  nameAr: string;
  shippingCost: number;
  estimatedDays: string;
}[] = [
  { name: 'Cairo', nameAr: 'القاهرة', shippingCost: 50, estimatedDays: '1-2' },
  { name: 'Giza', nameAr: 'الجيزة', shippingCost: 50, estimatedDays: '1-2' },
  { name: 'Qalyubia', nameAr: 'القليوبية', shippingCost: 55, estimatedDays: '1-3' },
  { name: 'Alexandria', nameAr: 'الإسكندرية', shippingCost: 65, estimatedDays: '2-3' },
  { name: 'Beheira', nameAr: 'البحيرة', shippingCost: 70, estimatedDays: '2-4' },
  { name: 'Gharbia', nameAr: 'الغربية', shippingCost: 70, estimatedDays: '2-4' },
  { name: 'Menoufia', nameAr: 'المنوفية', shippingCost: 70, estimatedDays: '2-4' },
  { name: 'Dakahlia', nameAr: 'الدقهلية', shippingCost: 70, estimatedDays: '2-4' },
  { name: 'Sharqia', nameAr: 'الشرقية', shippingCost: 70, estimatedDays: '2-4' },
  { name: 'Kafr El Sheikh', nameAr: 'كفر الشيخ', shippingCost: 75, estimatedDays: '2-4' },
  { name: 'Damietta', nameAr: 'دمياط', shippingCost: 75, estimatedDays: '2-4' },
  { name: 'Port Said', nameAr: 'بورسعيد', shippingCost: 75, estimatedDays: '2-4' },
  { name: 'Ismailia', nameAr: 'الإسماعيلية', shippingCost: 75, estimatedDays: '2-4' },
  { name: 'Suez', nameAr: 'السويس', shippingCost: 75, estimatedDays: '2-4' },
  { name: 'Faiyum', nameAr: 'الفيوم', shippingCost: 75, estimatedDays: '2-4' },
  { name: 'Beni Suef', nameAr: 'بني سويف', shippingCost: 80, estimatedDays: '3-5' },
  { name: 'Minya', nameAr: 'المنيا', shippingCost: 85, estimatedDays: '3-5' },
  { name: 'Asyut', nameAr: 'أسيوط', shippingCost: 90, estimatedDays: '3-5' },
  { name: 'Sohag', nameAr: 'سوهاج', shippingCost: 90, estimatedDays: '3-5' },
  { name: 'Qena', nameAr: 'قنا', shippingCost: 95, estimatedDays: '3-6' },
  { name: 'Luxor', nameAr: 'الأقصر', shippingCost: 95, estimatedDays: '3-6' },
  { name: 'Aswan', nameAr: 'أسوان', shippingCost: 100, estimatedDays: '4-6' },
  { name: 'Red Sea', nameAr: 'البحر الأحمر', shippingCost: 110, estimatedDays: '4-7' },
  { name: 'New Valley', nameAr: 'الوادي الجديد', shippingCost: 120, estimatedDays: '5-8' },
  { name: 'Matrouh', nameAr: 'مطروح', shippingCost: 110, estimatedDays: '4-7' },
  { name: 'North Sinai', nameAr: 'شمال سيناء', shippingCost: 120, estimatedDays: '5-8' },
  { name: 'South Sinai', nameAr: 'جنوب سيناء', shippingCost: 115, estimatedDays: '4-7' },
];
