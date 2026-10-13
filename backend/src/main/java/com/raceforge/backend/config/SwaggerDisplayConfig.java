package com.raceforge.backend.config;

import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springdoc.core.properties.SwaggerUiConfigProperties;
import org.springdoc.core.properties.SwaggerUiOAuthProperties;
import org.springdoc.core.providers.ObjectMapperProvider;
import org.springdoc.webmvc.ui.SwaggerIndexPageTransformer;
import org.springdoc.webmvc.ui.SwaggerIndexTransformer;
import org.springdoc.webmvc.ui.SwaggerWelcomeCommon;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.resource.ResourceTransformerChain;
import org.springframework.web.servlet.resource.TransformedResource;

@Configuration
public class SwaggerDisplayConfig {
    @Bean
    public SwaggerIndexTransformer swaggerIndexTransformer(SwaggerUiConfigProperties config,
            SwaggerUiOAuthProperties oauth, SwaggerWelcomeCommon welcome, ObjectMapperProvider mapper) {
        return new SwaggerIndexPageTransformer(config, oauth, welcome, mapper) {
            @Override
            public Resource transform(HttpServletRequest request, Resource resource,
                    ResourceTransformerChain chain) throws IOException {
                Resource transformed = super.transform(request, resource, chain);
                if (!"index.html".equals(resource.getFilename())) {
                    return transformed;
                }
                String html = transformed.getContentAsString(StandardCharsets.UTF_8);
                html = html.replace("<script src=\"./swagger-initializer.js\"",
                        "<script src=\"./raceforge-errors.js\"></script>\n<script src=\"./swagger-initializer.js\"");
                return new TransformedResource(transformed, html.getBytes(StandardCharsets.UTF_8));
            }
        };
    }

    @RestController
    static class SwaggerAssets {
        @GetMapping(value = "/swagger-ui/raceforge-errors.js", produces = "application/javascript")
        Resource errorsScript() {
            return new ClassPathResource("swagger/raceforge-errors.js");
        }
    }
}
