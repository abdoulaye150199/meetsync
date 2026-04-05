import phoneImage from '../../assets/Free iPhone Air (1).png';

const floatingLabels: Array<{ text: string; rotation: string; position: string }> = [];

const PhoneMockup = () => {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {/* Floating Labels */}
      {floatingLabels.map((label) => (
        <div
          key={label.text}
          className={`absolute ${label.position} z-20`}
          style={{ transform: `rotate(${label.rotation})` }}
        >
          <div className="rounded-xl border-2 border-white bg-white/10 backdrop-blur-sm px-6 py-3">
            <span className="font-serif text-xl italic text-white lg:text-2xl">
              {label.text}
            </span>
          </div>
        </div>
      ))}

      {/* Phone Image */}
      <div className="relative z-10 w-[950px] lg:w-[1100px] xl:w-[1300px] scale-150 -mr-12 translate-y-8">
        <img
          src={phoneImage}
          alt="MeetSync App sur téléphone"
          className="view-transition-phone view-transition-hand h-auto w-full drop-shadow-2xl"
        />
      </div>
    </div>
  );
};

export default PhoneMockup;
