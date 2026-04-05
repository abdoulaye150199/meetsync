// const navLinks = [
//   { label: 'ACCUEIL', href: '#accueil', active: true },
//   { label: 'A Propos', href: '#apropos', active: false },
//   { label: 'Services', href: '#services', active: false },
//   { label: 'Contact', href: '#contact', active: false },
// ];

import ViewTransitionLink from '../ViewTransitionLink';

const Header = () => {
  return (
    <header className="sticky top-0 z-50" style={{ backgroundColor: '#01333D' }}>
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <ViewTransitionLink
          to="/"
          className="font-logo text-2xl tracking-[2px] text-white transition hover:opacity-90"
          style={{ fontFamily: 'Jersey 10' }}
        >
          MEET SYNC
        </ViewTransitionLink>

        {/* <nav className="hidden md:block">
          <ul className="flex items-center gap-8">
            {navLinks.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className={[
                    'rounded-sm px-2 py-1 text-sm font-medium text-white transition',
                    link.active
                      ? 'bg-white/15 backdrop-blur-sm'
                      : 'hover:bg-white/10 hover:backdrop-blur-sm',
                  ].join(' ')}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav> */}

        <ViewTransitionLink
          to="/login"
          className="glass-3d-btn inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-105 hover:text-white focus:outline-none"
        >
          Se connecter
        </ViewTransitionLink>
      </div>
    </header>
  );
};

export default Header;
