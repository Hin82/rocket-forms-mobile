import React from 'react';
import { Image } from 'react-native';

const LOGO_SIZE = 30;

export default function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      style={{ width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: LOGO_SIZE / 2 }}
      resizeMode="contain"
      accessible={false}
    />
  );
}
