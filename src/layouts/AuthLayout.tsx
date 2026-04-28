import { Box, Center, Container, Paper, Stack, Text } from '@mantine/core';
import { Outlet } from 'react-router-dom';

import { BrandLogo } from '../shared/components/BrandLogo';

export function AuthLayout() {
  return (
    <Box mih="100vh" bg="#f6f8fb" px="md" py="xl">
      <Center mih="calc(100vh - 64px)">
        <Container size={420} w="100%">
          <Paper p="xl" radius="md">
            <Stack gap="lg">
              <Stack gap={2}>
                <BrandLogo />
                <Text c="dimmed" size="sm">
                  Đăng nhập hệ thống nhân sự nội bộ.
                </Text>
              </Stack>
              <Outlet />
            </Stack>
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}
