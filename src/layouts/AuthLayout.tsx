import { Box, Center, Container, Group, Paper, SimpleGrid, Stack, Text, ThemeIcon } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { Outlet } from 'react-router-dom';

import { BrandLogo } from '../shared/components/BrandLogo';
import './AuthLayout.css';

const highlights = [
  'Tin cậy cho bộ phận nhân sự và lãnh đạo',
  'Kết nối dữ liệu chấm công và đơn từ tức thì',
  'Bảo mật theo tiêu chuẩn nội bộ của HACOM',
];

export function AuthLayout() {
  return (
    <Box mih="100vh" className="auth-page-bg" px="md" py="xl">
      <Center mih="calc(100vh - 64px)">
        <Container size={880} w="100%">
          <Paper shadow="xl" withBorder radius="xl" className="auth-shell">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="0">
              <Box p="xl" className="auth-intro">
                <Stack gap={16} justify="space-between" h="100%">
                  <Stack gap={16}>
                    <BrandLogo compact />
                    <Text size="xl" fw={700} className="auth-intro-title">
                      Giải pháp quản lý nhân sự nội bộ cho HACOM.
                    </Text>
                    <Text c="dimmed" size="sm" className="auth-intro-desc">
                      Quản lý hồ sơ nhân sự, chấm công, phê duyệt và báo cáo trong giao diện rõ ràng, hiện đại và tin cậy.
                    </Text>
                    <Stack gap={10} className="auth-intro-desc">
                      {highlights.map((item) => (
                        <Group key={item} align="flex-start" gap="sm" wrap="nowrap">
                          <ThemeIcon size={26} radius="xl" color="blue" variant="light">
                            <IconCheck size={15} />
                          </ThemeIcon>
                          <Text size="sm" c="dimmed">
                            {item}
                          </Text>
                        </Group>
                      ))}
                    </Stack>
                  </Stack>
                  <Text size="xs" c="dimmed" className="auth-intro-desc">
                    Giao diện thiết kế dành cho quy trình nội bộ, giúp nhóm HR thao tác nhanh và dễ dàng.
                  </Text>
                </Stack>
              </Box>
              <Box p="xl" className="auth-form-area">
                <Stack gap="lg" justify="center" h="100%">
                  <Stack gap={2} hiddenFrom="sm">
                    <BrandLogo compact />
                  </Stack>
                  <Stack gap={2}>
                    <Text fw={700} size="lg">
                      Đăng nhập
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
