import { FaGooglePlay } from 'react-icons/fa6';
import { SiApple } from 'react-icons/si';
import phoneImage from '../../assets/Free iPhone Air (1).png';

const HeroSection = () => {
  return (
    <section className="flex h-[calc(100vh-70px)] items-center justify-center overflow-hidden bg-white px-6">
      <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 items-center gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        {/* Left Content */}
        <div className="max-w-3xl">
          <h1 className="mb-3 text-[clamp(2.1rem,3vw,1.5rem)] font-logo font-bold leading-tight text-slate-900">
            Transformez chaque réunion
            <br />
            en valeur mesurable
          </h1>

          <p className="mb-5 text-[1.1rem] leading-relaxed text-slate-700">
            <span className="font-logo">MeetSync</span> connecte réunions professionnelles, suivi du temps
            <br />
            et décisions pour une meilleure performance d'équipe.
          </p>

          <a
            href="#signup"
            className="mb-10 inline-block rounded-[10px] border-2 border-primary px-8 py-2 text-[1.1rem] font-medium text-primary transition hover:bg-primary hover:text-white"
          >
            S'inscrire
          </a>

          <div>
            <p className="mb-4 text-[1.1rem] leading-snug text-slate-700">
              Utilisez <span className="font-logo">MeetSync</span> sur le web ou téléchargez l'application
              <br />
              mobile pour rester productif, même en déplacement.
            </p>

            <h1 className="mb-4 text-base font-bold tracking-wider text-text-dark">
              TÉLÉCHARGER SUR
            </h1>

            <div className="flex flex-col gap-3 max-w-sm">
              <a
                href="#playstore"
                className="flex items-center gap-3 rounded bg-[#01333D] px-4 py-3 text-[1rem] text-white transition hover:bg-primary-dark hover:-translate-y-0.5"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm bg-white/15 text-lg">
                  <FaGooglePlay />
                </span>
                <span>Play Store</span>
              </a>

              <a
                href="#appstore"
                className="flex items-center gap-3 rounded bg-[#01333D] px-4 py-3 text-[1rem] text-white transition hover:bg-primary-dark hover:-translate-y-0.5"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm bg-white/15 text-lg">
                  <SiApple />
                </span>
                <span>App Store</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Phone Section */}
        <div className="relative h-[1000px] w-full lg:h-[1100px]">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-[clamp(500px,100vw,1200px)] transform translate-x-[55%] translate-y-[-10%] lg:translate-x-[45%] lg:translate-y-[-5%]">
              <img
                src={phoneImage}
                alt="MeetSync App sur téléphone"
                className="view-transition-phone view-transition-hand relative z-10 scale-[1.1] -rotate-[20deg] origin-[70%_80%] drop-shadow-[0_20px_35px_rgba(0,0,0,0.2)]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
