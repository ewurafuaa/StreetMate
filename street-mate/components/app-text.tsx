import { Text as RNText, StyleSheet, TextProps } from 'react-native';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

const fontMap: Record<Weight, string> = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

type AppTextProps = TextProps & {
  weight?: Weight;
};

export function AppText({ style, weight = 'regular', ...props }: AppTextProps) {
  return <RNText style={[{ fontFamily: fontMap[weight] }, style]} {...props} />;
}