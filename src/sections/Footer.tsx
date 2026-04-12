import { Mail, PhoneCall, MessageCircle } from 'lucide-react';
import { footerConfig } from '../config';

const Footer = () => {
  if (!footerConfig.brandName) return null;

  const companyLinks = [
    'About Pure Water',
    'Team',
    'Careers',
    'Dealership/ Distributorship',
    'In the Press',
    'Blog',
    'Find the Nearest Store',
  ];

  const policyLinks = [
    'Privacy Policy',
    'Terms of Use',
    'Warranty and Support',
    'Billing and Shipping',
    'Returns and Refund',
  ];

  const supportLinks = ['Contact Us', 'Book Consultation', 'Register Warranty', 'Track Order', 'Account', 'Manage Subscriptions'];

  return (
    <footer id="footer" className="bg-[#f4f6f8] py-14 md:py-16">
      <div className="mx-auto max-w-[1240px] px-4 md:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-5 font-display text-[32px] font-semibold text-[#1e2b38]">Company</h3>
            <ul className="space-y-3 text-[16px] text-[#2f3f4f]">
              {companyLinks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 font-display text-[32px] font-semibold text-[#1e2b38]">Policy</h3>
            <ul className="space-y-3 text-[16px] text-[#2f3f4f]">
              {policyLinks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 font-display text-[32px] font-semibold text-[#1e2b38]">Support</h3>
            <ul className="space-y-3 text-[16px] text-[#2f3f4f]">
              {supportLinks.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-5 font-display text-[32px] font-semibold text-[#1e2b38]">Contact</h3>
            <ul className="space-y-4 text-[16px] text-[#2f3f4f]">
              <li className="flex items-center gap-3">
                <Mail size={18} className="text-[#0f5da0]" />
                care@purewater.in
              </li>
              <li className="flex items-center gap-3">
                <PhoneCall size={18} className="text-[#0f5da0]" />
                1800-121-0599
              </li>
              <li className="flex items-center gap-3">
                <MessageCircle size={18} className="text-[#0f5da0]" />
                +91 91485 45840
              </li>
            </ul>

            <div className="mt-6 space-y-3 text-[16px] leading-7 text-[#2f3f4f]">
              <p>
                <span className="font-semibold text-[#1e2b38]">Manufacturer Name</span> -
                <br />
                Pure Water Technologies Pvt. Ltd.
              </p>
              <p>
                <span className="font-semibold text-[#1e2b38]">Manufacturer Address</span> - A31,
                <br />
                Industrial Estate, Phase 1,
                <br />
                Bengaluru,
                <br />
                Karnataka 560048
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-[#d8e0e8] pt-6 text-sm text-[#5f7080]">
          {footerConfig.copyrightText}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
