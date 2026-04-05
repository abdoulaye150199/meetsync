import { Link, type LinkProps, useNavigate } from 'react-router-dom';
import { type MouseEvent } from 'react';
import { flushSync } from 'react-dom';

const isModifiedEvent = (event: MouseEvent<HTMLAnchorElement>) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;

const ViewTransitionLink = ({
  to,
  replace,
  state,
  target,
  reloadDocument,
  onClick,
  ...rest
}: LinkProps) => {
  const navigate = useNavigate();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (isModifiedEvent(event)) return;
    if (target && target !== '_self') return;
    if (reloadDocument) return;

    event.preventDefault();

    const navigateTo = () => {
      navigate(to, { replace, state });
    };

    if (typeof document !== 'undefined' && 'startViewTransition' in document) {
      const docWithTransition = document as Document & {
        startViewTransition?: (updateCallback: () => void | Promise<void>) => { finished: Promise<void> };
      };

      docWithTransition.startViewTransition?.(() => {
        flushSync(() => {
          navigateTo();
        });
      });
    } else {
      navigateTo();
    }
  };

  return (
    <Link
      to={to}
      replace={replace}
      state={state}
      target={target}
      reloadDocument={reloadDocument}
      onClick={handleClick}
      {...rest}
    />
  );
};

export default ViewTransitionLink;
