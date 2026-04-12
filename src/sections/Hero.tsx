import { useMemo } from 'react';
import { heroConfig } from '../config';

const Hero = () => {
  if (!heroConfig.title) return null;

  const cleanTitle = useMemo(() => heroConfig.title.replace(/\n/g, ' '), []);

  return (
    <section id="hero" className="bg-[#f5f7fb] pt-4 md:pt-6">
      <div className="mx-auto max-w-[1240px] px-4 md:px-6">
        <div className="relative overflow-hidden rounded-sm border border-[#dfe5eb]">
          <img
            src={heroConfig.backgroundImage}
            alt="Water solutions banner"
            className="h-[250px] w-full object-cover md:h-[320px]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-white/45 to-white/85" />
          <div className="absolute inset-0 flex items-center justify-center px-6 md:justify-end md:px-16">
            <div className="max-w-[460px] text-center md:text-right">
              <p className="mb-2 text-xs font-semibold tracking-[0.15em] text-[#0f5da0] md:text-sm">
                {heroConfig.tagline}
              </p>
              <h1 className="font-display text-[34px] font-semibold leading-tight text-[#20242a] md:text-[56px]">
                {cleanTitle}
              </h1>
              <p className="mt-2 text-base text-[#3d4d5b] md:text-xl">Range of Filters and Softeners</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
