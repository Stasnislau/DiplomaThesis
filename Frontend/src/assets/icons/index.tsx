import { ReactComponent as EyeSvg } from './eye.svg';
import { ReactComponent as EyeSlashSvg } from './eyeSlashed.svg';
import Icon from '../../components/common/Icon';
import { IconProps } from '../../components/common/Icon';
export const EyeIcon = (props: IconProps) => <Icon src={EyeSvg} {...props} />;
export const EyeSlashIcon = (props: IconProps) => <Icon src={EyeSlashSvg} {...props} />;