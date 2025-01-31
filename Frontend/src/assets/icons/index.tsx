import { ReactComponent as EyeSvg } from "./eye.svg";
import { ReactComponent as EyeSlashSvg } from "./eyeSlashed.svg";
import { ReactComponent as CheckCircleSvg } from "./checkCircle.svg";
import { ReactComponent as SpainSvg } from "./flags/spain.svg";
import { ReactComponent as FranceSvg } from "./flags/france.svg";
import { ReactComponent as GermanySvg } from "./flags/germany.svg";
import { ReactComponent as ItalySvg } from "./flags/italy.svg";
import { ReactComponent as RussiaSvg } from "./flags/russia.svg";

import { ReactComponent as PolandSvg } from "./flags/poland.svg";
import { ReactComponent as BritainSvg } from "./flags/britain.svg";
import Icon from "../../components/common/Icon";
import { IconProps } from "../../components/common/Icon";

export const EyeIcon = (props: IconProps) => <Icon src={EyeSvg} {...props} />;

export const EyeSlashIcon = (props: IconProps) => (
  <Icon src={EyeSlashSvg} {...props} />
);
export const CheckCircleIcon = (props: IconProps) => (
  <Icon src={CheckCircleSvg} {...props} />
);
export const SpanishFlagIcon = (props: IconProps) => (
  <Icon src={SpainSvg} {...props} />
);

export const FrenchFlagIcon = (props: IconProps) => (
  <Icon src={FranceSvg} {...props} />
);

export const GermanFlagIcon = (props: IconProps) => (
  <Icon src={GermanySvg} {...props} />
);

export const ItalianFlagIcon = (props: IconProps) => (
  <Icon src={ItalySvg} {...props} />
);

export const RussianFlagIcon = (props: IconProps) => (
  <Icon src={RussiaSvg} {...props} />
);

export const PolishFlagIcon = (props: IconProps) => (
  <Icon src={PolandSvg} {...props} />
);

export const BritishFlagIcon = (props: IconProps) => (
  <Icon src={BritainSvg} {...props} />
);
