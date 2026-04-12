import {
  BadgeCheck,
  CircleDollarSign,
  HandHelping,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react';

const stats = [
  { value: '2000000+', label: 'HAPPY CUSTOMERS' },
  { value: '50+', label: 'PRODUCTS' },
  { value: '8000+', label: '5 STAR REVIEWS' },
];

const socialCards = [
  { image: 'images/blog_hair.jpg', title: 'Experts recommend our hard-water filters' },
  { image: 'images/blog_shower.jpg', title: 'Customers share visible hair and skin improvements' },
  { image: 'images/blog_kitchen.jpg', title: 'Loved by families across India' },
  { image: 'images/about_lab.jpg', title: 'Trusted quality and tested performance' },
];

const promiseItems = [
  { icon: CircleDollarSign, title: '60 Day Moneyback' },
  { icon: Wrench, title: 'Easy Installation' },
  { icon: ShieldCheck, title: '5 Year Warranty' },
  { icon: Truck, title: 'Free Shipping' },
  { icon: HandHelping, title: 'COD Available' },
  { icon: BadgeCheck, title: 'Free Installation Kit' },
];

const StoreHighlights = () => {
  return (
    <section className="bg-[#f4f6f8] pb-10 md:pb-16">
      <div className="mx-auto max-w-[1240px] px-4 md:px-6">
        <div className="rounded-sm bg-[#eef2f7] px-6 py-10 md:px-12 md:py-14">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="text-center">
                <p className="font-display text-[52px] font-extrabold leading-none text-[#0f5da0] md:text-[74px]">{item.value}</p>
                <p className="mt-4 text-sm font-semibold tracking-[0.12em] text-[#1d2a36]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {socialCards.map((item) => (
            <article key={item.title} className="overflow-hidden rounded-md border border-[#d7dee6] bg-white shadow-sm">
              <img src={item.image} alt={item.title} className="h-[210px] w-full object-cover" />
              <div className="p-4">
                <p className="text-sm font-medium leading-6 text-[#2b3a49]">{item.title}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-sm bg-white px-4 py-8 md:px-10 md:py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {promiseItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="text-center">
                  <div className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#d5e0ea] text-[#0f5da0]">
                    <Icon size={32} strokeWidth={1.7} />
                  </div>
                  <p className="text-sm font-medium text-[#2b3a49]">{item.title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StoreHighlights;
