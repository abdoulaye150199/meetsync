import { FaGooglePlay } from 'react-icons/fa6';
import { SiApple } from 'react-icons/si';
import ViewTransitionLink from '../ViewTransitionLink';
import phoneImage from '../../assets/Free iPhone Air (1).png';

const HeroSection = () => {
  return (
    <section
      className="box-border flex h-[calc(100svh-72px)] min-h-[calc(100svh-72px)] max-h-[calc(100svh-72px)] items-center justify-center overflow-hidden bg-white px-4 pt-6 pb-0 sm:px-6 lg:px-8 lg:pt-4 lg:pb-0"
    >
      <div className="mx-auto grid h-full w-full max-w-[1600px] grid-cols-1 items-center gap-4 lg:items-end lg:gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* Left Content */}
        <div className="mx-auto w-full max-w-3xl lg:mx-0 lg:self-center lg:pl-8 xl:pl-12">
          <h1 className="mb-3 text-[clamp(1.8rem,4vw,2.8rem)] font-logo font-bold leading-tight text-slate-900">
            Transformez chaque réunion
            <br />
            en valeur mesurable
          </h1>

          <p className="mb-6 text-[1rem] leading-relaxed text-slate-700 lg:text-[1.1rem]">
            <span className="font-logo">MeetSync</span> connecte réunions professionnelles, suivi du temps
            <br />
            et décisions pour une meilleure performance d'équipe.
          </p>

          <ViewTransitionLink
            to="/login?mode=register"
            className="mb-8 inline-block rounded-[10px] border-2 border-primary px-6 py-2 text-base font-medium text-primary transition hover:bg-primary hover:text-white lg:mb-10 lg:px-8 lg:text-[1.1rem]"
          >
            S'inscrire
          </ViewTransitionLink>

          <div>
            <p className="mb-4 text-sm leading-snug text-slate-700 lg:text-[1.1rem]">
              Utilisez <span className="font-logo">MeetSync</span> sur le web ou téléchargez l'application
              <br />
              mobile pour rester productif, même en déplacement.
            </p>

            <h2 className="mb-3 text-xs font-bold tracking-wider text-text-dark lg:mb-4 lg:text-base">
              TÉLÉCHARGER SUR
            </h2>

            <div className="flex flex-col gap-2 max-w-sm lg:gap-3">
              <a
                href="#playstore"
                className="flex items-center gap-3 rounded bg-[#01333D] px-4 py-2 text-sm text-white transition hover:bg-primary-dark hover:-translate-y-0.5 lg:py-3 lg:text-[1rem]"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm bg-white/15 text-base lg:h-7 lg:w-7 lg:text-lg">
                  <FaGooglePlay />
                </span>
                <span>Play Store</span>
              </a>

              <a
                href="#appstore"
                className="flex items-center gap-3 rounded bg-[#01333D] px-4 py-2 text-sm text-white transition hover:bg-primary-dark hover:-translate-y-0.5 lg:py-3 lg:text-[1rem]"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-sm bg-white/15 text-base lg:h-7 lg:w-7 lg:text-lg">
                  <SiApple />
                </span>
                <span>App Store</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Phone Section */}
        <div className="relative h-auto w-full self-end overflow-hidden lg:h-full lg:-ml-2 xl:ml-2">
          <div className="relative flex items-end justify-center overflow-hidden lg:h-full">
            <div className="relative w-[clamp(400px,100vw,820px)] lg:w-[clamp(820px,132vw,1360px)]">
              <img
                src={phoneImage}
                alt="MeetSync App sur téléphone"
                className="view-transition-phone view-transition-hand relative z-10 w-full scale-[1.14] translate-x-4 translate-y-2 -rotate-[20deg] origin-[70%_80%] drop-shadow-[0_24px_40px_rgba(0,0,0,0.22)] lg:translate-x-12 lg:translate-y-6 lg:scale-[1.34] xl:translate-x-16 xl:translate-y-10 xl:scale-[1.42]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
