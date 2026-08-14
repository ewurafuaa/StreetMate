import { Text as RNText, TextProps } from 'react-native';

type Weight = 'regular' | 'medium' | 'bold';

const fontMap: Record<Weight, string> = {
  regular: 'HelveticaNowDisplay-Regular',
  medium: 'HelveticaNowDisplay-Medium',
  bold: 'HelveticaNowDisplay-Bold',
};

type AppTextProps = TextProps & {
  weight?: Weight;
};

export function AppText({ style, weight = 'regular', ...props }: AppTextProps) {
  return <RNText style={[{ fontFamily: fontMap[weight] }, style]} {...props} />;
}