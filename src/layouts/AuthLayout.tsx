import { Box, Center, Container, Paper, Stack, Text, Title } from '@mantine/core';
import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <Box mih="100vh" bg="#f6f8fb" px="md" py="xl">
      <Center mih="calc(100vh - 64px)">
        <Container size={420} w="100%">
          <Paper p="xl" radius="md">
            <Stack gap="lg">
              <Stack gap={2}>
                <Title order={1} size="h2">
                  HACOM HRM
                </Title>
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
