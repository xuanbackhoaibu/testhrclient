import { Box, Center, Container, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { IconCheck } from '@tabler/icons-react';

import { BrandLogo } from '../shared/components/BrandLogo';

export function AuthLayout() {
  return (
    <Box mih="100vh" bg="linear-gradient(180deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-body) 100%)" px="md" py="xl">
      <Center mih="calc(100vh - 64px)">
        <Container size={880} w="100%">
          <Paper shadow="xl" withBorder radius="xl" style={{ overflow: 'hidden' }}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="0">
              <Box
                p="xl"
                style={{
                  background: 'linear-gradient(170deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-blue-1) 100%)',
                  minHeight: 460,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRight: '1px solid var(--mantine-color-gray-1)',
                }}
              >
                <Stack gap={16}>
                  <BrandLogo compact />
                  <Text size="xl" fw={700} style={{ maxWidth: 340, lineHeight: 1.15 }}>
                    Giải pháp quản lý nhân sự nội bộ cho HACOM.
                  </Text>
                  <Text c="dimmed" size="sm" style={{ maxWidth: 340, lineHeight: 1.8 }}>
                    Quản lý hồ sơ người dùng, chấm công, phê duyệt và báo cáo trong giao diện rõ ràng, hiện đại và tin cậy.
                  </Text>
                  <Stack gap={10} style={{ maxWidth: 360 }}>
                    {[
                      'Tin cậy cho bộ phận nhân sự và lãnh đạo',
                      'Kết nối dữ liệu chấm công và đơn từ tức thì',
                      'Bảo mật theo tiêu chuẩn nội bộ của HACOM',
                    ].map((item) => (
                      <Group key={item} align="flex-start" gap="sm">
                        <ThemeIcon size={28} radius="xl" color="blue" variant="light">
                          <IconCheck size={16} />
                        </ThemeIcon>
                        <Text size="sm" c="dimmed">
                          {item}
                        </Text>
                      </Group>
                    ))}
                  </Stack>
                </Stack>
                <Text size="xs" c="dimmed" style={{ maxWidth: 340 }}>
                  Giao diện thiết kế dành cho quy trình nội bộ, giúp nhóm HR thao tác nhanh và dễ dàng.
                </Text>
              </Box>

              <Box p="xl">
                <Stack gap={18} style={{ minHeight: 460, justifyContent: 'center' }}>
                  <Stack gap={4}>
                    <Text size="xl" fw={700}>
                      HACOM HRM
                    </Text>
                    <Text c="dimmed" size="sm">
                      Đăng nhập hệ thống nhân sự nội bộ.
                    </Text>
                  </Stack>
                  <Outlet />
                </Stack>
              </Box>
            </SimpleGrid>
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}
